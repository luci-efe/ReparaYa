-- Enable RLS on Message table
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from their bookings
CREATE POLICY "Users can read own booking messages" ON "Message"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b.id = "Message"."bookingId"
      AND (b."clientId" = auth.uid() OR b."contractorId" = auth.uid())
    )
  );

-- Policy: Users can insert messages to their bookings
CREATE POLICY "Users can send messages to own bookings" ON "Message"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b.id = "bookingId"
      AND (b."clientId" = auth.uid() OR b."contractorId" = auth.uid())
    )
  );

-- Enable Realtime for Message table
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
