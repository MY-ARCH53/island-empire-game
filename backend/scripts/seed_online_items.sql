INSERT INTO item_defs (id, name, slot, base_stats, rarity) VALUES
('wooden_sword',  'Ahşap Kılıç',      'weapon', '{"damage": 3}'::jsonb,      'common'),
('iron_sword',    'Demir Kılıç',      'weapon', '{"damage": 7}'::jsonb,      'rare'),
('cursed_blade',  'Lanetli Kılıç',    'weapon', '{"damage": 14}'::jsonb,     'epic'),
('cloth_armor',   'Kumaş Zırh',       'armor',  '{"armor": 2, "max_health": 10}'::jsonb, 'common'),
('chain_armor',   'Zincir Zırh',      'armor',  '{"armor": 5, "max_health": 25}'::jsonb, 'rare'),
('plate_armor',   'Plaka Zırh',       'armor',  '{"armor": 10, "max_health": 50}'::jsonb, 'epic'),
('wooden_shield', 'Ahşap Kalkan',     'shield', '{"armor": 2}'::jsonb,       'common'),
('iron_shield',   'Demir Kalkan',     'shield', '{"armor": 5}'::jsonb,       'rare'),
('aegis_shield',  'Aegis Kalkanı',    'shield', '{"armor": 10, "max_health": 15}'::jsonb, 'epic')
ON CONFLICT (id) DO NOTHING;

-- Bölgeli farm haritası (Tier4/elit bölge drop'u) — 2026-08-13, bkz.
-- plans/humble-chasing-galaxy.md "Bölgeli farm haritası". epic'in
-- ~%55-65 üstü, mevcut enchant sisteminin (%15/seviye) üzerine gerçek
-- bir sıçrama hissettirsin diye.
INSERT INTO item_defs (id, name, slot, base_stats, rarity) VALUES
('legendary_sword', 'Kan Kılıcı',  'weapon', '{"damage": 22}'::jsonb,                 'legendary'),
('legendary_armor', 'Kan Zırhı',   'armor',  '{"armor": 16, "max_health": 80}'::jsonb, 'legendary'),
('legendary_shield','Kan Kalkanı', 'shield', '{"armor": 16, "max_health": 25}'::jsonb, 'legendary')
ON CONFLICT (id) DO NOTHING;

SELECT id, name, slot, rarity FROM item_defs ORDER BY slot, rarity;
