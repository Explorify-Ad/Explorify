-- ===========================================
-- Seed Data: Dublin Landmarks
-- ===========================================
-- 20+ Dublin landmarks with real coordinates, categories, and accessibility info

INSERT INTO landmarks (name, latitude, longitude, category, accessibility_level, is_indoor, description, points, avg_visit_duration_min) VALUES

-- Historical Landmarks
('Trinity College Dublin', 53.34399700, -6.25449900, 'historical', 5, false, 'Ireland''s oldest university, founded in 1592. Home to the Book of Kells and stunning Georgian architecture.', 20, 60),
('Dublin Castle', 53.34280800, -6.26727900, 'historical', 3, true, 'Historic castle dating back to 1204. Features medieval tower, state apartments, and beautiful gardens.', 25, 45),
('GPO (General Post Office)', 53.34918800, -6.26012200, 'historical', 5, true, 'Iconic building on O''Connell Street, headquarters of the 1916 Easter Rising. Houses a museum and working post office.', 15, 30),
('Kilmainham Gaol', 53.34194500, -6.31013500, 'historical', 2, true, 'Former prison turned museum. Key site in Irish history where leaders of the 1916 Rising were executed.', 25, 60),
('Christ Church Cathedral', 53.34330600, -6.27118600, 'historical', 2, true, 'Medieval cathedral founded c. 1030. Features stunning architecture, crypt, and the tomb of Strongbow.', 20, 45),
('St. Patrick''s Cathedral', 53.33923500, -6.27139100, 'historical', 2, true, 'Ireland''s largest cathedral, founded in 1191. Associated with Jonathan Swift, author of Gulliver''s Travels.', 20, 40),

-- Cultural Landmarks
('Temple Bar', 53.34539000, -6.26417600, 'cultural', 5, false, 'Dublin''s cultural quarter known for its vibrant nightlife, street performers, galleries, and restaurants.', 15, 45),
('Guinness Storehouse', 53.34177500, -6.28673400, 'cultural', 5, true, 'Ireland''s top visitor attraction. Seven floors of interactive exhibits about the history of Guinness beer.', 30, 90),
('EPIC The Irish Emigration Museum', 53.34776800, -6.24756200, 'cultural', 5, true, 'Award-winning interactive museum exploring the story of Irish emigration across the world.', 20, 60),
('National Gallery of Ireland', 53.34070800, -6.25228800, 'cultural', 5, true, 'Houses an extensive collection of Irish and European art spanning from the Middle Ages to present day.', 15, 60),
('Jameson Distillery Bow St.', 53.34822100, -6.27725900, 'cultural', 5, true, 'Interactive whiskey experience in the original Jameson distillery. Includes guided tours and tastings.', 25, 60),
('National Museum of Ireland', 53.34050300, -6.25505700, 'cultural', 5, true, 'Free museum showcasing Irish archaeology, art, natural history, and decorative arts collections.', 15, 45),

-- Nature Landmarks
('St. Stephen''s Green', 53.33773400, -6.25913200, 'nature', 5, false, 'Beautiful Victorian public park in the heart of Dublin. Features a lake, gardens, sculptures, and playground.', 10, 30),
('Phoenix Park', 53.35614800, -6.32936100, 'nature', 5, false, 'One of Europe''s largest enclosed city parks. Home to Dublin Zoo, Áras an Uachtaráin, and wild deer herds.', 20, 90),
('Merrion Square', 53.33921300, -6.24870100, 'nature', 5, false, 'Georgian square with beautiful gardens, colorful doors, and a statue of Oscar Wilde. Popular lunch spot.', 10, 20),
('Dublin Zoo', 53.35523600, -6.30494800, 'nature', 5, false, 'One of the world''s oldest zoos, located in Phoenix Park. Home to over 400 animals from around the globe.', 25, 120),

-- Shopping
('Grafton Street', 53.34152100, -6.25934300, 'shopping', 5, false, 'Dublin''s premier shopping street. Pedestrianized area with shops, cafes, and street performers.', 10, 30),

-- Sports
('Croke Park', 53.36064900, -6.25146100, 'sports', 5, false, 'Ireland''s largest sports stadium and home of the GAA. Features the GAA Museum and Skyline tour.', 20, 60),

-- Architecture
('Custom House', 53.34809600, -6.25256300, 'architecture', 5, false, 'Stunning 18th-century neoclassical building on the River Liffey. One of Dublin''s finest Georgian buildings.', 10, 15),

-- Landmark
('Ha''penny Bridge', 53.34643200, -6.26336700, 'landmark', 5, false, 'Iconic pedestrian bridge over the River Liffey, built in 1816. One of Dublin''s most photographed landmarks.', 10, 10);
