import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import type { WebhookEvent } from "@clerk/nextjs/server";

/**
 * Webhook de Clerk para sincronizar usuarios
 *
 * Eventos soportados:
 * - user.created: Crear usuario en DB con rol CLIENT por defecto
 * - user.updated: Actualizar email, firstName, lastName, avatarUrl
 * - user.deleted: Soft delete (status = BLOCKED)
 *
 * Seguridad:
 * - Verificación de firma svix antes de procesar
 * - Idempotencia garantizada por constraint único en clerkUserId
 *
 * @see https://clerk.com/docs/integrations/webhooks
 */
export async function POST(req: NextRequest) {
  // 1. Obtener webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        service: "clerk-webhook",
        error: "CLERK_WEBHOOK_SECRET no está configurado",
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // 2. Obtener headers necesarios para verificación desde el request
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  // Validar que headers existan
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        service: "clerk-webhook",
        error: "Missing svix headers",
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // 3. Obtener body del request
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. Verificar firma con svix
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        service: "clerk-webhook",
        error: "Invalid webhook signature",
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // 5. Procesar evento según tipo
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;

        const primaryEmail =
          email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
            ?.email_address || email_addresses[0]?.email_address;

        if (!primaryEmail) {
          throw new Error("No se encontró email primario");
        }

        // Crear usuario en DB (idempotente con upsert)
        const user = await db.user.upsert({
          where: { clerkUserId: id },
          update: {
            email: primaryEmail,
            firstName: first_name || "",
            lastName: last_name || "",
            avatarUrl: image_url || null,
          },
          create: {
            clerkUserId: id,
            email: primaryEmail,
            firstName: first_name || "",
            lastName: last_name || "",
            avatarUrl: image_url || null,
            role: "CLIENT", // Rol por defecto
            status: "ACTIVE",
          },
        });

        console.log(
          JSON.stringify({
            level: "INFO",
            service: "clerk-webhook",
            eventType: "user.created",
            clerkUserId: id,
            userId: user.id,
            action: "created",
            timestamp: new Date().toISOString(),
          })
        );

        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;

        const primaryEmail =
          email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
            ?.email_address || email_addresses[0]?.email_address;

        if (!primaryEmail) {
          throw new Error("No se encontró email primario");
        }

        // Actualizar usuario (idempotente)
        const user = await db.user.upsert({
          where: { clerkUserId: id },
          update: {
            email: primaryEmail,
            firstName: first_name || "",
            lastName: last_name || "",
            avatarUrl: image_url || null,
          },
          create: {
            clerkUserId: id,
            email: primaryEmail,
            firstName: first_name || "",
            lastName: last_name || "",
            avatarUrl: image_url || null,
            role: "CLIENT",
            status: "ACTIVE",
          },
        });

        console.log(
          JSON.stringify({
            level: "INFO",
            service: "clerk-webhook",
            eventType: "user.updated",
            clerkUserId: id,
            userId: user.id,
            action: "updated",
            timestamp: new Date().toISOString(),
          })
        );

        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        // Soft delete: marcar como BLOCKED en lugar de eliminar
        const user = await db.user.update({
          where: { clerkUserId: id },
          data: {
            status: "BLOCKED",
          },
        });

        console.log(
          JSON.stringify({
            level: "INFO",
            service: "clerk-webhook",
            eventType: "user.deleted",
            clerkUserId: id,
            userId: user.id,
            action: "soft_deleted",
            timestamp: new Date().toISOString(),
          })
        );

        break;
      }

      default: {
        console.log(
          JSON.stringify({
            level: "DEBUG",
            service: "clerk-webhook",
            eventType,
            action: "ignored",
            message: "Evento no procesado",
            timestamp: new Date().toISOString(),
          })
        );
      }
    }

    return NextResponse.json(
      { success: true, eventType },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        service: "clerk-webhook",
        eventType,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
    );

    // Retornar 500 para que Clerk reintente
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}
