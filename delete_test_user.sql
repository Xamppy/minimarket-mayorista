-- Script para eliminar el usuario de prueba lulzsec9888@gmail.com
-- Puedes ejecutar este script en tu cliente PostgreSQL

-- Ver información del usuario antes de eliminar
SELECT id, email, role, created_at 
FROM users 
WHERE email = 'lulzsec9888@gmail.com';

-- Eliminar el usuario (también eliminará su perfil por CASCADE)
DELETE FROM users 
WHERE email = 'lulzsec9888@gmail.com';

-- Confirmar eliminación
SELECT COUNT(*) as usuarios_restantes 
FROM users 
WHERE email = 'lulzsec9888@gmail.com';

-- Si el resultado es 0, el usuario fue eliminado exitosamente
