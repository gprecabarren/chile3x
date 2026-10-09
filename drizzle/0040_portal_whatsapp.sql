CREATE TABLE `portal_whatsapp_events` (
  `id` text PRIMARY KEY NOT NULL,
  `recorded_on` text NOT NULL,
  `contact_id` text NOT NULL,
  `contact_label` text NOT NULL,
  `action` text NOT NULL CHECK (`action` IN ('panel_open', 'contact_click')),
  `placement` text NOT NULL CHECK (`placement` IN ('floating', 'header', 'footer', 'contact', 'about', 'registration')),
  `hits` integer DEFAULT 1 NOT NULL CHECK (`hits` > 0)
);
--> statement-breakpoint
CREATE INDEX `portal_whatsapp_events_day_idx` ON `portal_whatsapp_events` (`recorded_on`);
