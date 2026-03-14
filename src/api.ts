// --- API Client ---

const API_BASE = '/api';

export interface Product {
    id: string;
    name: string;
    category: 'computador' | 'notebook' | 'celular' | 'outro';
    quantity: number;
    price: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductPayload {
    name: string;
    category: Product['category'];
    quantity: number;
    price: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erro desconhecido.' }));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function fetchProducts(userId: string): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`, {
        headers: { 'x-user-id': userId }
    });
    return handleResponse<Product[]>(res);
}

export async function createProduct(userId: string, data: CreateProductPayload): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
}

export async function updateProduct(userId: string, id: string, data: Partial<CreateProductPayload>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
}

export async function deleteProduct(userId: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
    });
    await handleResponse(res);
}
