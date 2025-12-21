\c postgres

SELECT pg_terminate_backend(pg_stat_activity.pid) 
FROM pg_stat_activity 
WHERE pg_stat_activity.datname = 'restaurant_db' 
AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS restaurant_db;
CREATE DATABASE restaurant_db;

\c restaurant_db
