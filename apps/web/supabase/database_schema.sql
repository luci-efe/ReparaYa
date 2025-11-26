-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Address (
  id text NOT NULL,
  userId text NOT NULL,
  addressLine1 text NOT NULL,
  addressLine2 text,
  city text NOT NULL,
  state text NOT NULL,
  postalCode text NOT NULL,
  country text NOT NULL DEFAULT 'MX'::text,
  lat numeric,
  lng numeric,
  isDefault boolean NOT NULL DEFAULT false,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Address_pkey PRIMARY KEY (id),
  CONSTRAINT Address_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.AdminAuditLog (
  id text NOT NULL,
  adminId text NOT NULL,
  action text NOT NULL,
  targetType text NOT NULL,
  targetId text NOT NULL,
  metadata jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT AdminAuditLog_pkey PRIMARY KEY (id),
  CONSTRAINT AdminAuditLog_adminId_fkey FOREIGN KEY (adminId) REFERENCES public.User(id)
);
CREATE TABLE public.Availability (
  id text NOT NULL,
  serviceId text NOT NULL,
  date date NOT NULL,
  startTime timestamp without time zone NOT NULL,
  endTime timestamp without time zone NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'AVAILABLE'::"AvailabilityStatus",
  bookingId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Availability_pkey PRIMARY KEY (id),
  CONSTRAINT Availability_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Availability_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id)
);
CREATE TABLE public.Booking (
  id text NOT NULL,
  serviceId text NOT NULL,
  clientId text NOT NULL,
  contractorId text NOT NULL,
  availabilityId text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING_PAYMENT'::"BookingStatus",
  scheduledDate timestamp without time zone NOT NULL,
  address text NOT NULL,
  notes text,
  basePrice numeric NOT NULL,
  finalPrice numeric NOT NULL,
  anticipoAmount numeric NOT NULL,
  liquidacionAmount numeric NOT NULL,
  comisionAmount numeric NOT NULL,
  contractorPayoutAmount numeric NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Booking_pkey PRIMARY KEY (id),
  CONSTRAINT Booking_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Booking_clientId_fkey FOREIGN KEY (clientId) REFERENCES public.User(id),
  CONSTRAINT Booking_contractorId_fkey FOREIGN KEY (contractorId) REFERENCES public.User(id)
);
CREATE TABLE public.BookingStateHistory (
  id text NOT NULL,
  bookingId text NOT NULL,
  fromState USER-DEFINED NOT NULL,
  toState USER-DEFINED NOT NULL,
  changedBy text NOT NULL,
  notes text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT BookingStateHistory_pkey PRIMARY KEY (id),
  CONSTRAINT BookingStateHistory_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT BookingStateHistory_changedBy_fkey FOREIGN KEY (changedBy) REFERENCES public.User(id)
);
CREATE TABLE public.ContractorProfile (
  id text NOT NULL,
  userId text NOT NULL,
  businessName text NOT NULL,
  description text NOT NULL,
  specialties ARRAY,
  verified boolean NOT NULL DEFAULT false,
  verificationDocuments jsonb,
  stripeConnectAccountId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ContractorProfile_pkey PRIMARY KEY (id),
  CONSTRAINT ContractorProfile_userId_fkey FOREIGN KEY (userId) REFERENCES public.User(id)
);
CREATE TABLE public.ContractorServiceLocation (
  id text NOT NULL,
  contractorProfileId text NOT NULL,
  street character varying NOT NULL,
  exteriorNumber character varying NOT NULL,
  interiorNumber character varying,
  neighborhood character varying,
  city character varying NOT NULL,
  state character varying NOT NULL,
  postalCode character varying NOT NULL,
  country character varying NOT NULL,
  baseLatitude numeric,
  baseLongitude numeric,
  normalizedAddress text,
  timezone character varying,
  geocodingStatus USER-DEFINED NOT NULL DEFAULT 'PENDING'::"GeocodingStatus",
  zoneType USER-DEFINED NOT NULL,
  radiusKm integer,
  polygonCoordinates jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ContractorServiceLocation_pkey PRIMARY KEY (id),
  CONSTRAINT ContractorServiceLocation_contractorProfileId_fkey FOREIGN KEY (contractorProfileId) REFERENCES public.ContractorProfile(id)
);
CREATE TABLE public.Dispute (
  id text NOT NULL,
  bookingId text NOT NULL,
  openedBy text NOT NULL,
  reason text NOT NULL,
  evidence jsonb,
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::"DisputeStatus",
  resolution text,
  resolutionNotes text,
  resolvedBy text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolvedAt timestamp without time zone,
  CONSTRAINT Dispute_pkey PRIMARY KEY (id),
  CONSTRAINT Dispute_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Dispute_openedBy_fkey FOREIGN KEY (openedBy) REFERENCES public.User(id),
  CONSTRAINT Dispute_resolvedBy_fkey FOREIGN KEY (resolvedBy) REFERENCES public.User(id)
);
CREATE TABLE public.Message (
  id text NOT NULL,
  bookingId text NOT NULL,
  senderId text NOT NULL,
  text character varying NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Message_pkey PRIMARY KEY (id),
  CONSTRAINT Message_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Message_senderId_fkey FOREIGN KEY (senderId) REFERENCES public.User(id)
);
CREATE TABLE public.Payment (
  id text NOT NULL,
  bookingId text NOT NULL,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'mxn'::text,
  stripePaymentIntentId text,
  stripeCheckoutSessionId text,
  stripeTransferId text,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::"PaymentStatus",
  metadata jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Payment_pkey PRIMARY KEY (id),
  CONSTRAINT Payment_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id)
);
CREATE TABLE public.ProcessedWebhookEvent (
  id text NOT NULL,
  stripeEventId text NOT NULL,
  eventType text NOT NULL,
  processedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ProcessedWebhookEvent_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Rating (
  id text NOT NULL,
  bookingId text NOT NULL,
  serviceId text NOT NULL,
  clientId text NOT NULL,
  stars integer NOT NULL,
  comment character varying,
  moderationStatus USER-DEFINED NOT NULL DEFAULT 'PENDING'::"ModerationStatus",
  moderationNotes text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT Rating_pkey PRIMARY KEY (id),
  CONSTRAINT Rating_bookingId_fkey FOREIGN KEY (bookingId) REFERENCES public.Booking(id),
  CONSTRAINT Rating_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id),
  CONSTRAINT Rating_clientId_fkey FOREIGN KEY (clientId) REFERENCES public.User(id)
);
CREATE TABLE public.Service (
  id text NOT NULL,
  contractorId text NOT NULL,
  categoryId_old text NOT NULL,
  title character varying NOT NULL,
  description character varying NOT NULL,
  basePrice numeric NOT NULL,
  locationLat numeric,
  locationLng numeric,
  locationAddress text,
  coverageRadiusKm integer,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"ServiceStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  currency character varying NOT NULL DEFAULT 'MXN'::character varying,
  durationMinutes integer NOT NULL,
  visibilityStatus USER-DEFINED NOT NULL DEFAULT 'DRAFT'::"VisibilityStatus",
  lastPublishedAt timestamp without time zone,
  category text,
  categoryId text,
  CONSTRAINT Service_pkey PRIMARY KEY (id),
  CONSTRAINT Service_contractorId_fkey FOREIGN KEY (contractorId) REFERENCES public.User(id),
  CONSTRAINT Service_categoryId_fkey FOREIGN KEY (categoryId) REFERENCES public.ServiceCategory(id)
);
CREATE TABLE public.ServiceCategory (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  slug text NOT NULL,
  icon text,
  parentId text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ServiceCategory_pkey PRIMARY KEY (id),
  CONSTRAINT Category_parentId_fkey FOREIGN KEY (parentId) REFERENCES public.ServiceCategory(id)
);
CREATE TABLE public.ServiceImage (
  id text NOT NULL,
  serviceId text NOT NULL,
  s3Url text NOT NULL,
  s3Key text NOT NULL,
  order integer NOT NULL,
  width integer,
  height integer,
  altText character varying,
  uploadedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ServiceImage_pkey PRIMARY KEY (id),
  CONSTRAINT ServiceImage_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id)
);
CREATE TABLE public.ServiceRatingStats (
  serviceId text NOT NULL,
  average numeric NOT NULL,
  totalRatings integer NOT NULL DEFAULT 0,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT ServiceRatingStats_pkey PRIMARY KEY (serviceId),
  CONSTRAINT ServiceRatingStats_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id)
);
CREATE TABLE public.User (
  id text NOT NULL,
  clerkUserId text NOT NULL,
  email text NOT NULL,
  firstName text NOT NULL,
  lastName text NOT NULL,
  phone text,
  avatarUrl text,
  role USER-DEFINED NOT NULL DEFAULT 'CLIENT'::"UserRole",
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"UserStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT User_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_images (
  id text NOT NULL,
  serviceId text NOT NULL,
  s3Url character varying NOT NULL,
  s3Key character varying NOT NULL,
  order smallint NOT NULL,
  width smallint,
  height smallint,
  altText character varying,
  uploadedAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_images_pkey PRIMARY KEY (id),
  CONSTRAINT service_images_serviceId_fkey FOREIGN KEY (serviceId) REFERENCES public.Service(id)
);
