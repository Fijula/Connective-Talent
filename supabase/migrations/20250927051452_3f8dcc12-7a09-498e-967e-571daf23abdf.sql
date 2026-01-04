-- Update existing profiles with sample names for testing
UPDATE profiles 
SET first_name = 'Sarah', last_name = 'Chen' 
WHERE user_id = '19bdcc7d-8f21-44fc-9a4a-e1d07b4e4b53';

UPDATE profiles 
SET first_name = 'Alex', last_name = 'Rodriguez' 
WHERE user_id = 'c361bc9f-2fd0-4e3e-9136-c3b503b56bd8';