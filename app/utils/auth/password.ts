import bcrypt from 'bcryptjs';

// Número de rondas para el salt (12 es un buen balance entre seguridad y rendimiento)
const SALT_ROUNDS = 12;

// Hash de contraseña
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error al hacer hash de la contraseña:', error);
    throw new Error('Error al procesar la contraseña');
  }
};

// Verificar contraseña
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error al verificar la contraseña:', error);
    throw new Error('Error al verificar la contraseña');
  }
};

// Validar fortaleza de contraseña
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Longitud mínima
  if (password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  // Longitud máxima
  if (password.length > 128) {
    errors.push('La contraseña no puede tener más de 128 caracteres');
  }
  
  // Al menos una letra
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra');
  }
  
  // Al menos un número
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  
  // Caracteres no permitidos (solo para evitar problemas de encoding)
  if (/[\x00-\x1F\x7F]/.test(password)) {
    errors.push('La contraseña contiene caracteres no válidos');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generar contraseña temporal segura
// Generar contraseña temporal segura y legible
export const generateTemporaryPassword = (length: number = 12): string => {
  // Eliminamos caracteres ambiguos: l, 1, I, O, 0
  // Eliminamos caracteres especiales problemáticos en HTML/URL: &, <, >, ", ', `
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // sin l
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O
  const numbers = '23456789'; // sin 0, 1
  const symbols = '!@#$^*'; // sin &, %, (, )
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
};