-- WARNING
-- THIS SHOULD ONLY BE USED FOR TESTING!!
-- THIS SHOULD *NEVER* AND I MEAN *NEVER* BE USED FOR THE REAL THING!!!


INSERT INTO "User" (username, email, "passwordHash", "updatedAt", privilege)
	VALUES (
		'admin',
		'admin@gmail.com',
		'$2a$10$r3.ILlia.8XBew8pbLr8CO3WpAjSg8ofv9RjWSqknKzQg3fmC5ycW',
		'2024-01-01T01:00:00.000Z+00:00',
		'ADMIN'
	);

-- username: admin
-- password: admin