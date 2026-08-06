-- Reference data: routes, parks, platform settings

\restrict AK6BBGHSUmVmuMpSWUSyI2qY3WSf8ChrloCHJ5vMSlRguDGNN3Rq2XgAuP9jr7K

INSERT INTO public.parks VALUES ('458a8378-524d-4c6f-aa91-1bfb3824c0ce', 'Terminus Park', 'Jos', 'Terminus, Jos North', '+2348012345001', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');
INSERT INTO public.parks VALUES ('d5435bc9-49ac-4abc-809c-17ca67cb839e', 'Bauchi Road Park', 'Jos', 'Bauchi Road, Jos', '+2348012345002', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');
INSERT INTO public.parks VALUES ('0d81df70-710c-45c3-bc24-cbcd43835489', 'Bukuru Park', 'Jos', 'Bukuru, Jos South', '+2348012345003', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');
INSERT INTO public.parks VALUES ('57642ad3-6b3c-4cac-acba-599866fe5a7a', 'Rayfield Park', 'Jos', 'Rayfield, Jos South', '+2348012345004', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');
INSERT INTO public.parks VALUES ('08678169-277b-44bc-bf57-de3a561d7938', 'Utako Park', 'Abuja', 'Utako, FCT', '+2348012345005', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');
INSERT INTO public.parks VALUES ('067a6179-ef4d-4c33-b8a5-0b41d5d9754a', 'Jabi Park', 'Abuja', 'Jabi, FCT', '+2348012345006', 'active', '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');

INSERT INTO public.platform_settings VALUES (true, 2000, '2026-06-06 08:53:06.060095+00', '2026-06-06 08:53:06.060095+00');

INSERT INTO public.routes VALUES ('3c05745f-4ad8-44ac-b299-ab770dc32bd9', 'Jos', 'Abuja', 13000, '2026-01-24 12:03:12.601923+00');
INSERT INTO public.routes VALUES ('646e6297-9b77-4608-a9df-f923c42494f5', 'Abuja', 'Jos', 13000, '2026-01-24 12:03:12.601923+00');

\unrestrict AK6BBGHSUmVmuMpSWUSyI2qY3WSf8ChrloCHJ5vMSlRguDGNN3Rq2XgAuP9jr7K
