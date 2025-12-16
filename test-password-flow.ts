import { generateTemporaryPassword, hashPassword } from './app/utils/auth/password';
import bcrypt from 'bcryptjs';

async function testPasswordFlow() {
  console.log('--- INICIANDO TEST DE FLUJO DE CONTRASEÑA ---');

  // 1. Generar contraseña
  const password = generateTemporaryPassword(12);
  console.log(`1. Contraseña generada: "${password}"`);
  console.log(`   Longitud: ${password.length}`);

  // 2. Hashear contraseña
  console.log('2. Hasheando contraseña...');
  const hash = await hashPassword(password);
  console.log(`   Hash generado: ${hash}`);

  // 3. Verificar contraseña (simulando login)
  console.log('3. Verificando contraseña (simulando login)...');
  const isValid = await bcrypt.compare(password, hash);
  
  if (isValid) {
    console.log('✅ ÉXITO: La contraseña coincide con el hash.');
  } else {
    console.error('❌ ERROR: La contraseña NO coincide con el hash.');
  }

  // 4. Prueba con caracteres especiales específicos
  console.log('\n--- PRUEBA DE CARACTERES ESPECIALES ---');
  const specialChars = '!@#$%^&*';
  console.log(`Probando con: "${specialChars}"`);
  const specialHash = await hashPassword(specialChars);
  const specialValid = await bcrypt.compare(specialChars, specialHash);
  
  if (specialValid) {
    console.log('✅ ÉXITO: Caracteres especiales verificados correctamente.');
  } else {
    console.error('❌ ERROR: Fallo con caracteres especiales.');
  }
}

testPasswordFlow().catch(console.error);
