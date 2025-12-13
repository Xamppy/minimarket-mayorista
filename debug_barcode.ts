
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

async function check() {
  console.log('Connecting to DB...');
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const barcode = '7806500731177'; // The barcode from the logs
    console.log(`Checking barcode: '${barcode}'`);

    // 1. Check Exact Match in Products
    const pRes = await client.query('SELECT id, name, barcode FROM products WHERE barcode = $1', [barcode]);
    console.log(`Exact match in products: ${pRes.rows.length}`);
    
    if (pRes.rows.length > 0) {
        const product = pRes.rows[0];
        console.log('Product Found:', product);
        
        // 2. Check Stock Entries
        const sRes = await client.query('SELECT id, current_quantity, expiration_date FROM stock_entries WHERE product_id = $1', [product.id]);
        console.log(`Stock Entries found: ${sRes.rows.length}`);
        sRes.rows.forEach(r => {
            console.log(` - Entry ID: ${r.id}, Qty: ${r.current_quantity}, Exp: ${r.expiration_date}`);
        });
    } else {
        console.log('Product NOT found with exact match.');
        
        // 3. Check for whitespace or hidden chars in DB
        const likeRes = await client.query('SELECT id, name, barcode FROM products WHERE barcode LIKE $1', [`%7806500731177%`]);
        console.log(`LIKE match found: ${likeRes.rows.length}`);
        likeRes.rows.forEach(r => {
            console.log(` - Match: '${r.barcode}' (Length: ${r.barcode.length}), Name: ${r.name}`);
            console.log(`   (Char codes: ${r.barcode.split('').map((c: string) => c.charCodeAt(0)).join(',')})`);
        });
    }

  } catch (e) {
      console.error(e);
  } finally {
      await client.end();
  }
}

check();
