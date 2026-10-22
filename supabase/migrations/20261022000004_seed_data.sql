-- ============================================================================
-- HOTEL LE MEDINA & RESTO - SUPABASE SCHEMA MIGRATION 04: SEED DATA
-- Idempotent initial seed data for development & staging
-- ============================================================================

-- 1. Profiles & Roles
INSERT INTO public.profiles (id, full_name, email, phone, country)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Laila Benjelloun', 'admin@lemedinahotel.com', '+212 524 38 90 00', 'Indonesia'),
    ('22222222-2222-2222-2222-222222222222', 'Youssef Alami', 'reservations@lemedinahotel.com', '+212 524 38 90 01', 'Indonesia'),
    ('33333333-3333-3333-3333-333333333333', 'Sophia Laurent', 'editor@lemedinahotel.com', '+33 6 12 34 56 78', 'France')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'super_admin'),
    ('22222222-2222-2222-2222-222222222222', 'reservation_staff'),
    ('33333333-3333-3333-3333-333333333333', 'content_editor')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Site Pengaturan
INSERT INTO public.site_settings (key, value, description)
VALUES 
    ('hotel_info', '{
        "name": "Hôtel Le Médina & Resto",
        "tagline": "Hotel nyaman untuk pengalaman menginap berkesan",
        "stars": 5,
        "address": "Singkawang, Kalimantan Barat, Indonesia",
        "phone": "+212 524 38 90 00",
        "whatsapp": "+212661389000",
        "email": "concierge@lemedinahotel.com",
        "check_in_time": "15:00",
        "check_out_time": "12:00",
        "currency": "EUR"
    }'::jsonb, 'General hotel contact and operational info'),
    ('social_links', '{
        "instagram": "https://instagram.com/lemedinasingkawang",
        "facebook": "https://facebook.com/lemedinasingkawang",
        "tripadvisor": "https://tripadvisor.com"
    }'::jsonb, 'Public social media URLs')
ON CONFLICT (key) DO NOTHING;

-- 3. Tipe Kamars
INSERT INTO public.room_types (id, name, slug, tagline, description, base_price_cents, currency, max_adults, max_children, size_sqm, bed_type, view_type, amenities, sort_order)
VALUES
    (
        'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Sultana Royal Courtyard Suite',
        'sultana-royal-suite',
        'Opulent palace suite with hand-carved cedar ceilings and private fountain terrace',
        'The Sultana Suite epitomizes classic Andalusian aristocracy. Featuring a spacious salon adorned with authentic zellige tiles, a master bedroom draped in raw silk, an open-hearth fireplace, and an en-suite tadelakt bathroom with a sunken marble bath.',
        42000,
        'EUR',
        3,
        1,
        65.0,
        'King Imperial Bed',
        'Central Riad Courtyard & Fountain',
        ARRAY['Private Balcony', 'Sunken Marble Bath', 'Open Fireplace', 'Complimentary Breakfast', 'Butler Service', 'Nespresso Atelier', 'High-Speed Wi-Fi', 'Artisanal Argan Toiletries'],
        1
    ),
    (
        'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Majorelle Garden Deluxe',
        'majorelle-garden-deluxe',
        'Vibrant cobalt-tinted sanctuary overlooking fragrant citrus orchards',
        'Inspired by the legendary botanical gardens of Singkawang, this light-filled haven boasts vaulted arches, custom brass lanterns, bespoke wrought-iron furnishings, and a serene reading nook overlooking our private orange blossom garden.',
        31000,
        'EUR',
        2,
        1,
        45.0,
        'King Bed or Twin Beds',
        'Orange Blossom Garden',
        ARRAY['Garden View Terrace', 'Rainforest Shower', 'Plush Robes & Slippers', 'Complimentary Breakfast', 'Mini Bar & Organic Teas', 'Smart Satellite TV', 'Organic Skincare'],
        2
    ),
    (
        'c3333333-cccc-cccc-cccc-cccccccccccc',
        'Atlas Panorama Rooftop Suite',
        'atlas-panorama-rooftop-suite',
        'Elevated penthouse luxury with panoramic snow-capped Atlas Mountain vistas',
        'Perched atop Le Médina, the Atlas Panorama Suite boasts floor-to-ceiling French doors opening to an exclusive 25-sqm private rooftop solarium. Stargaze in your outdoor copper soaking tub or savor afternoon tea beneath embroidered Berber canopy curtains.',
        55000,
        'EUR',
        2,
        0,
        75.0,
        'Four-Poster Super King',
        'Atlas Mountains & Medina Skyline',
        ARRAY['Private 25sqm Solarium', 'Outdoor Copper Tub', 'Sunset Cocktail Bar', 'VIP Airport Transfer', 'Private Hammam Session', 'Fireplace', 'Bang & Olufsen Sound'],
        3
    ),
    (
        'd4444444-dddd-dddd-dddd-dddddddddddd',
        'Riad Jasmine Heritage Room',
        'riad-jasmine-heritage-room',
        'Intimate and romantic jewel box celebrating Indonesia craftsmanship',
        'Warm terracotta tones, hand-hammered copper sconces, and woven Fez kilims create an intimate and restful cocoon for couples seeking authentic serenity within the historic Medina.',
        22000,
        'EUR',
        2,
        0,
        34.0,
        'Queen Artisanal Bed',
        'Quiet Jasmine Patio',
        ARRAY['Handcrafted Tadelakt Shower', 'Organic Herb Teas', 'Complimentary Indonesia Breakfast', 'Safe & Climate Control', 'Marshall Bluetooth Speaker'],
        4
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Physical Kamar Inventory
INSERT INTO public.rooms (id, room_type_id, room_number, floor, wing, status)
VALUES
    ('a0010000-0000-0000-0000-000000000001', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Suite 101', 1, 'Courtyard Wing', 'available'),
    ('a0010000-0000-0000-0000-000000000002', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Suite 102', 1, 'Courtyard Wing', 'available'),
    ('b0020000-0000-0000-0000-000000000001', 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Deluxe 201', 2, 'Garden Wing', 'available'),
    ('b0020000-0000-0000-0000-000000000002', 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Deluxe 202', 2, 'Garden Wing', 'available'),
    ('c0030000-0000-0000-0000-000000000001', 'c3333333-cccc-cccc-cccc-cccccccccccc', 'Atlas Penthouse 301', 3, 'Rooftop Belvedere', 'available'),
    ('d0040000-0000-0000-0000-000000000001', 'd4444444-dddd-dddd-dddd-dddddddddddd', 'Room 105', 1, 'Jasmine Patio', 'available'),
    ('d0040000-0000-0000-0000-000000000002', 'd4444444-dddd-dddd-dddd-dddddddddddd', 'Room 106', 1, 'Jasmine Patio', 'available')
ON CONFLICT (id) DO NOTHING;

-- 5. Room Images
INSERT INTO public.room_images (room_type_id, image_url, alt_text, is_primary, sort_order)
VALUES
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', 'Sultana Royal Suite Master Bedroom with zellige details', true, 1),
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', 'Sultana Suite luxurious tadelakt bathroom', false, 2),
    ('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80', 'Majorelle Garden Deluxe arched bedroom', true, 1),
    ('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80', 'Majorelle Deluxe private sunny patio', false, 2),
    ('c3333333-cccc-cccc-cccc-cccccccccccc', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', 'Atlas Panorama Rooftop Suite with mountain views', true, 1),
    ('c3333333-cccc-cccc-cccc-cccccccccccc', 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80', 'Private copper soaking tub on rooftop deck', false, 2),
    ('d4444444-dddd-dddd-dddd-dddddddddddd', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80', 'Riad Jasmine Heritage bedroom warm lighting', true, 1)
ON CONFLICT (id) DO NOTHING;

-- 6. Seasonal Room Tarif
INSERT INTO public.room_rates (room_type_id, rate_name, start_date, end_date, price_cents, min_stay_nights)
VALUES
    ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Winter Holiday Oasis High Season', '2026-12-20', '2027-01-05', 52000, 3),
    ('c3333333-cccc-cccc-cccc-cccccccccccc', 'Atlas Winter Starlight Season', '2026-11-01', '2026-12-31', 65000, 2)
ON CONFLICT (id) DO NOTHING;

-- 7. Restaurant Categories
INSERT INTO public.restaurant_categories (id, name, slug, description, sort_order)
VALUES
    ('e1111111-eeee-eeee-eeee-eeeeeeeeeeee', 'Entrées & Indonesia Mezze', 'mezze', 'Delicate salads, savory pastries and spiced dips prepared fresh at dawn', 1),
    ('e2222222-eeee-eeee-eeee-eeeeeeeeeeee', 'Artisanal Tagines & Couscous', 'tagines', 'Slow-cooked earthenware pots infused with saffron, preserved lemon and dried fruits', 2),
    ('e3333333-eeee-eeee-eeee-eeeeeeeeeeee', 'Wood-Fired Grills & Specialties', 'grills', 'Prime Atlas meats and Atlantic seafood grilled over charcoal olive wood', 3),
    ('e4444444-eeee-eeee-eeee-eeeeeeeeeeee', 'Pastries & Infusions', 'desserts', 'Almond briouats, honey-drizzled pastillas and hand-poured mint tea ceremonies', 4)
ON CONFLICT (id) DO NOTHING;

-- 8. Restaurant Menu Items
INSERT INTO public.restaurant_menu (category_id, name, description, price_cents, is_vegetarian, is_vegan, is_signature, image_url, sort_order)
VALUES
    (
        'e1111111-eeee-eeee-eeee-eeeeeeeeeeee',
        'Le Médina Royal Mezze Platter',
        'Seven classical Indonesia salads including Zaalouk eggplant, spiced beetroot, Mechouia grilled peppers, and caramelized pumpkin with sesame.',
        1800,
        true,
        true,
        true,
        'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80',
        1
    ),
    (
        'e1111111-eeee-eeee-eeee-eeeeeeeeeeee',
        'Crispy Pigeon & Almond Pastilla',
        'Golden filo pastry parcels layered with shredded spiced squab pigeon, roasted almonds, cinnamon, and powdered orange blossom sugar.',
        2400,
        false,
        false,
        true,
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
        2
    ),
    (
        'e2222222-eeee-eeee-eeee-eeeeeeeeeeee',
        'Slow-Braised Lamb Shank Tagine',
        'Tender 8-hour braised pasture-fed lamb with caramelized golden figs, toasted walnuts, sesame seeds, and saffron-cardamom broth.',
        3200,
        false,
        false,
        true,
        'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
        1
    ),
    (
        'e2222222-eeee-eeee-eeee-eeeeeeeeeeee',
        'Cornish Hen Tagine with Preserved Lemon & Olives',
        'Free-range chicken simmered gently with hand-cured Meslalla olives, wild thyme, and organic pickled lemons from our Taroudant farm.',
        2700,
        false,
        false,
        false,
        'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=800&q=80',
        2
    ),
    (
        'e2222222-eeee-eeee-eeee-eeeeeeeeeeee',
        'Seven Vegetable Royal Couscous',
        'Hand-rolled semolina steamed thrice over fragrant vegetable bouillon, topped with sweet caramelized onions, chickpeas and root harvest.',
        2200,
        true,
        true,
        false,
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
        3
    ),
    (
        'e3333333-eeee-eeee-eeee-eeeeeeeeeeee',
        'Atlantic Sea Bass Chermoula Filet',
        'Fresh catch from Essaouira harbor seared with fresh coriander, smoked paprika, garlic, cumin, and roasted cherry tomatoes.',
        3400,
        false,
        false,
        false,
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
        1
    ),
    (
        'e4444444-eeee-eeee-eeee-eeeeeeeeeeee',
        'Traditional Mint Tea Ceremony with Mignardises',
        'Fresh spear mint and wild verbena poured from antique silver teapots, accompanied by gazelle horns and honey almond briouats.',
        1200,
        true,
        false,
        true,
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        1
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Hotel Facilities
INSERT INTO public.facilities (name, tagline, description, icon_name, image_url, opening_hours, sort_order)
VALUES
    (
        'Les Bains de Médina Fasilitas',
        'Purification in Ancient Warm Marble Chambers',
        'Indulge in time-honored traditional rituals featuring black soap body wraps, eucalyptus steam rooms, argan oil massages, and private marble soaking baths.',
        'sparkles',
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
        '09:00 - 21:00 Daily',
        1
    ),
    (
        'Courtyard Emerald Basin Pool',
        'Sun-Dappled Serenity & Shaded Daybeds',
        'A heated mosaic basin tiled in deep emerald zellige, framed by sour orange trees, swaying banana palms, and comfortable linen-draped daybeds.',
        'waves',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
        '07:00 - 20:00 Daily',
        2
    ),
    (
        'Starlight Rooftop Terrace & Lounge',
        'Sunset Cocktails Over the Call to Prayer',
        'Savor handcrafted botanic cocktails and Indonesia wines while watching the sun sink behind the Koutoubia minaret and the Atlas Mountain peaks.',
        'moon',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        '16:00 - 00:00 Daily',
        3
    ),
    (
        'Masterclass Culinary Studio',
        'Market Walk & Cooking with our Chef',
        'Join Chef Fatima on an early morning souk spice foraging excursion followed by hands-on preparation of secret tagines and bread baking.',
        'utensils',
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        'Sessions at 10:00 & 16:00',
        4
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Promo Spesial
INSERT INTO public.offers (title, code, tagline, description, discount_percentage, valid_from, valid_to, image_url, is_active)
VALUES
    (
        'Romantic Riad Escape',
        'ROMANCE26',
        'Bottle of chilled champagne, daily hammam & candlelit dinner included',
        'Book 3 nights or more in any suite and receive airport luxury transfers, a complimentary 60-minute couple hammam ceremony, and a four-course dinner in the courtyard.',
        15,
        '2026-10-01',
        '2027-03-31',
        'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=800&q=80',
        true
    ),
    (
        'Atlas Winter Retreat',
        'ATLASWINTER',
        'Special seasonal rate for stays of 4 nights or more',
        'Warm fires, hot mint tea, and crisp mountain skies. Enjoy 20% savings on all suites plus daily breakfast feast and private guided Medina walking tour.',
        20,
        '2026-11-01',
        '2027-02-28',
        'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 11. Galeri Images
INSERT INTO public.gallery_images (category, title, image_url, caption, sort_order)
VALUES
    ('architecture', 'Central Marble Courtyard', 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80', 'Intricate stucco carving and zellige tiling around the courtyard pool', 1),
    ('architecture', 'Sunset Arcades & Lanterns', 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80', 'Golden hour across the Moorish archways and handcrafted brass lanterns', 2),
    ('suites', 'Sultana Suite Fireplace Salon', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', 'Rich velvet cushions and authentic Berber rug in the master salon', 3),
    ('dining', 'Courtyard Candlelit Dinner', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'Romantic evening dining beside the illuminated emerald water basin', 4),
    ('dining', 'Artisanal Tagine Presentation', 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=1200&q=80', 'Steaming slow-cooked lamb and fig tagine served hot from the coals', 5),
    ('wellness', 'The Royal Marble Hammam', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80', 'Private steam room carved from solid warm grey marble and tadelakt', 6),
    ('experiences', 'Private Medina Souk Tour', 'https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=1200&q=80', 'Guided excursion through Singkawang spice markets and weavers quarter', 7)
ON CONFLICT (id) DO NOTHING;

-- 12. Tamu Reviews
INSERT INTO public.guest_reviews (guest_name, origin_city, country, rating, title, comment, stay_date, is_verified, is_featured)
VALUES
    (
        'Eleanor & Marcus Vance',
        'London',
        'United Kingdom',
        5,
        'An absolute paradise hidden behind an unassuming Medina door',
        'Stepping from the bustling souks into Le Médina felt like entering an enchanted palace. The attention to detail is remarkable—fresh orange blossom water upon arrival, the most incredible lamb tagine we have ever tasted, and the Atlas Suite views at dawn are unforgettable.',
        '2026-09-15',
        true,
        true
    ),
    (
        'Dr. Jean-Philippe Moreau',
        'Geneva',
        'Switzerland',
        5,
        'Unmatched hospitality and sublime Indonesia gastronomy',
        'I have visited Singkawang twelve times, and Le Médina stands in a class of its own. Chef Fatima’s cooking class was a masterclass in subtlety, and the staff anticipates every wish before you can ask. Truly exceptional.',
        '2026-10-02',
        true,
        true
    ),
    (
        'Amina & Tariq Mansour',
        'Dubai',
        'United Arab Emirates',
        5,
        'Romantic, tranquil, and deeply authentic',
        'The private hammam and rooftop starlight lounge made our anniversary celebration genuinely magical. The bed was heavenly and the breakfast feast on our terrace was lavish. We will return every autumn.',
        '2026-10-18',
        true,
        true
    )
ON CONFLICT (id) DO NOTHING;
