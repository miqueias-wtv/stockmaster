import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- Prepared Statements ---
const getAllProducts = db.prepare(`
  SELECT * FROM products WHERE userId = ? ORDER BY updatedAt DESC
`);

const getProductByIdAndUser = db.prepare(`
  SELECT * FROM products WHERE id = ? AND userId = ?
`);

const insertProduct = db.prepare(`
  INSERT INTO products (id, name, category, quantity, price, userId, createdAt, updatedAt)
  VALUES (@id, @name, @category, @quantity, @price, @userId, datetime('now'), datetime('now'))
`);

const updateProduct = db.prepare(`
  UPDATE products
  SET name = @name, category = @category, quantity = @quantity, price = @price, updatedAt = datetime('now')
  WHERE id = @id AND userId = @userId
`);

const deleteProduct = db.prepare(`
  DELETE FROM products WHERE id = ? AND userId = ?
`);

// --- Middleware to Require authentication header ---
app.use('/api', (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string') {
        return res.status(401).json({ error: 'Não autorizado. Faça o login primeiro.' });
    }
    next();
});

// --- Routes ---

// GET all products
app.get('/api/products', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const products = getAllProducts.all(userId);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
});

// GET single product
app.get('/api/products/:id', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const product = getProductByIdAndUser.get(req.params.id, userId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Erro ao buscar produto.' });
    }
});

// POST create product
app.post('/api/products', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { name, category, quantity, price } = req.body;

        if (!name || !category) {
            return res.status(400).json({ error: 'Nome e categoria são obrigatórios.' });
        }

        if (!['computador', 'notebook', 'celular', 'outro'].includes(category)) {
            return res.status(400).json({ error: 'Categoria inválida.' });
        }

        const id = uuidv4();
        insertProduct.run({ id, name, category, quantity: quantity || 0, price: price || 0, userId });

        const newProduct = getProductByIdAndUser.get(id, userId);
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Erro ao criar produto.' });
    }
});

// PUT update product
app.put('/api/products/:id', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { name, category, quantity, price } = req.body;
        const { id } = req.params;

        const existing = getProductByIdAndUser.get(id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        updateProduct.run({
            id,
            userId,
            name: name ?? (existing as any).name,
            category: category ?? (existing as any).category,
            quantity: quantity ?? (existing as any).quantity,
            price: price ?? (existing as any).price
        });

        const updated = getProductByIdAndUser.get(id, userId);
        res.json(updated);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const existing = getProductByIdAndUser.get(req.params.id, userId);
        if (!existing) {
            return res.status(404).json({ error: 'Produto não encontrado ou você não tem permissão para excluí-lo.' });
        }

        deleteProduct.run(req.params.id, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Erro ao excluir produto.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 StockMaster API running at http://localhost:${PORT}`);
    console.log(`📦 Database: ./data/stockmaster.db`);
});
