-- UPDATE menu items with real Unsplash image URLs
UPDATE menu_items 
SET image_url = CASE 
    WHEN name = 'Chicken Biryani' THEN 'https://images.unsplash.com/photo-1563379091339-03246963d9d6?w=800&auto=format&fit=crop'
    WHEN name = 'Chicken Karahi' THEN 'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800&auto=format&fit=crop'
    WHEN name = 'Chicken Tikka' THEN 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop'
    WHEN name = 'Beef Nihari' THEN 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop'
    WHEN name = 'Chana Masala' THEN 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop'
    WHEN name = 'Beef Burger' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop'
    WHEN name = 'French Fries' THEN 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800&auto=format&fit=crop'
    WHEN name = 'Pizza Margherita' THEN 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&auto=format&fit=crop'
    WHEN name = 'Chicken Wings' THEN 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop'
    WHEN name = 'Club Sandwich' THEN 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&auto=format&fit=crop'
    WHEN name = 'Pasta Carbonara' THEN 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=800&auto=format&fit=crop'
    WHEN name = 'Grilled Salmon' THEN 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop'
    WHEN name = 'Beef Steak' THEN 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&auto=format&fit=crop'
    WHEN name = 'Caesar Salad' THEN 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&auto=format&fit=crop'
    WHEN name = 'Mushroom Risotto' THEN 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&auto=format&fit=crop'
    WHEN name = 'Coca-Cola' THEN 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop'
    WHEN name = 'Fresh Lime Soda' THEN 'https://images.unsplash.com/photo-1621592243572-52d7e6e14499?w=800&auto=format&fit=crop'
    WHEN name = 'Mango Lassi' THEN 'https://images.unsplash.com/photo-1628992682633-bf2d40cb595f?w=800&auto=format&fit=crop'
    WHEN name = 'Mineral Water' THEN 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&auto=format&fit=crop'
    WHEN name = 'Chocolate Brownie' THEN 'https://images.unsplash.com/photo-1564355808539-22fda35db7aa?w=800&auto=format&fit=crop'
    WHEN name = 'Cheesecake' THEN 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop'
    WHEN name = 'Gulab Jamun' THEN 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop'
    ELSE image_url
END
WHERE id IN (SELECT id FROM menu_items);

-- Verify the updates
SELECT id, name, image_url FROM menu_items ORDER BY category, name;
