/**
 * Hand-written source fixtures for the browser dev preview (`npm run dev:ui`).
 *
 * These are plain data only — every derived shape (line counts, language,
 * directory tree, tags, functions, duplicate clusters, API routes, import
 * graph, Laravel schema) is computed from this content by `mock-api.ts`, using
 * the same algorithms as the Rust backend and the real `@shared/*` builders.
 * That keeps every screen internally consistent: clicking a duplicate cluster
 * jumps to the line the block actually starts on.
 *
 * Only loaded when `isTauriRuntime()` is false.
 */

import type { FolderRow, GitRepoInfo } from '@shared/api';

export interface MockFile {
  relPath: string;
  /** Days before "now" of this file's last commit; `null` means untracked. */
  lastCommitDaysAgo: number | null;
  content: string;
}

export interface MockProject {
  files: MockFile[];
  repoInfo: GitRepoInfo | null;
  authors: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed offsets so `created_at DESC` ordering is deterministic. */
export const MOCK_FOLDERS: FolderRow[] = [
  {
    id: 1,
    rootPath: '/Users/dev/projects/acme-api',
    name: 'acme-api',
    createdAt: Date.now() - 3 * DAY_MS,
    isAvailable: true,
  },
  {
    id: 2,
    rootPath: '/Users/dev/projects/acme-console',
    name: 'acme-console',
    createdAt: Date.now() - 12 * DAY_MS,
    isAvailable: true,
  },
  {
    id: 3,
    rootPath: '/Volumes/Archive/legacy-crm',
    name: 'legacy-crm',
    createdAt: Date.now() - 90 * DAY_MS,
    isAvailable: false,
  },
];

/** Returned by `folders.pickDirectory()` — the native picker cannot run here. */
export const MOCK_PICKED_DIRECTORY = '/Users/dev/projects/acme-mobile';

const DUPLICATED_PHP_VALIDATION = `        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:64'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
        $payload = $request->validate($rules);
        $payload['price'] = (int) round($payload['price'] * 100);
        $payload['currency'] = strtoupper($payload['currency']);
        $payload['source'] = $request->header('X-Client', 'web');
        return $payload;`;

const DUPLICATED_TS_STATUS_TONES = `const TONE_BY_STATUS: Record<string, string> = {
  pending: 'warning',
  paid: 'success',
  shipped: 'info',
  refunded: 'danger',
  cancelled: 'neutral',
  disputed: 'danger',
  archived: 'neutral',
};`;

const DUPLICATED_TS_FORMAT_BYTES = `  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex += 1;
  }
  const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  const rounded = size.toFixed(digits);
  return rounded + ' ' + units[unitIndex];`;

const ACME_API_FILES: MockFile[] = [
  {
    relPath: 'composer.json',
    lastCommitDaysAgo: 41,
    content: `{
  "name": "acme/api",
  "type": "project",
  "description": "Acme order and catalogue API.",
  "require": {
    "php": "^8.3",
    "laravel/framework": "^11.9",
    "laravel/sanctum": "^4.0"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0"
  },
  "autoload": {
    "psr-4": {
      "App\\\\": "app/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "Tests\\\\": "tests/"
    }
  }
}
`,
  },
  {
    relPath: 'artisan',
    lastCommitDaysAgo: 120,
    content: `#!/usr/bin/env php
<?php

use Illuminate\\Foundation\\Console\\Kernel;

define('LARAVEL_START', microtime(true));

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$status = $kernel->handle(
    $input = new Symfony\\Component\\Console\\Input\\ArgvInput(),
    new Symfony\\Component\\Console\\Output\\ConsoleOutput()
);

$kernel->terminate($input, $status);

exit($status);
`,
  },
  {
    relPath: 'README.md',
    lastCommitDaysAgo: 8,
    content: `# acme-api

Order and catalogue API for the Acme storefront.

## Getting started

    composer install
    php artisan migrate
    php artisan serve

## Layout

- \`routes/api\` — versioned HTTP surface
- \`app/Models\` — Eloquent models
- \`app/Services\` — order pricing and fulfilment
- \`database/migrations\` — schema history
`,
  },
  {
    relPath: 'routes/api.php',
    lastCommitDaysAgo: 4,
    content: `<?php

use App\\Http\\Controllers\\UserController;
use Illuminate\\Support\\Facades\\Route;

// Health probe used by the load balancer.
Route::get('/health', [UserController::class, 'health'])->name('health');

Route::get('/me', [UserController::class, 'show'])->name('me.show');
Route::patch('/me', [UserController::class, 'update'])->name('me.update');

// TODO: split the admin surface into routes/api/admin.php
require base_path('routes/api/orders.php');
require base_path('routes/api/catalog.php');
`,
  },
  {
    relPath: 'routes/api/orders.php',
    lastCommitDaysAgo: 2,
    content: `<?php

use App\\Http\\Controllers\\OrderController;
use Illuminate\\Support\\Facades\\Route;

Route::prefix('orders')->name('orders.')->group(function () {
    Route::get('/', [OrderController::class, 'index'])->name('index');
    Route::post('/', [OrderController::class, 'store'])->name('store');
    Route::get('/{order}', [OrderController::class, 'show'])->name('show');
    Route::patch('/{order}', [OrderController::class, 'update'])->name('update');
    Route::delete('/{order}', [OrderController::class, 'destroy'])->name('destroy');
    Route::post('/{order}/refund', [OrderController::class, 'refund'])->name('refund');
});

// FIXME: exports time out on large tenants, move to a queued job
Route::get('/orders-export', [OrderController::class, 'export'])->name('orders.export');
`,
  },
  {
    relPath: 'routes/api/catalog.php',
    lastCommitDaysAgo: 19,
    content: `<?php

use App\\Http\\Controllers\\ProductController;
use Illuminate\\Support\\Facades\\Route;

Route::apiResource('products', ProductController::class);

Route::get('/products/{product}/related', [ProductController::class, 'related'])->name('products.related');
Route::match(['put', 'patch'], '/products/{product}/stock', [ProductController::class, 'stock'])->name('products.stock');
`,
  },
  {
    relPath: 'app/Models/User.php',
    lastCommitDaysAgo: 33,
    content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function displayName(): string
    {
        $name = trim($this->name ?? '');
        return $name === '' ? $this->email : $name;
    }
}
`,
  },
  {
    relPath: 'app/Models/Order.php',
    lastCommitDaysAgo: 5,
    content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\Relations\\MorphMany;

class Order extends Model
{
    protected $fillable = ['user_id', 'status', 'total_cents', 'currency', 'placed_at'];

    protected $casts = ['placed_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tags(): MorphMany
    {
        return $this->morphMany(Tag::class, 'taggable');
    }

    // NOTE: totals are stored in minor units, never floats
    public function totalMajorUnits(): float
    {
        return $this->total_cents / 100;
    }
}
`,
  },
  {
    relPath: 'app/Models/OrderItem.php',
    lastCommitDaysAgo: 26,
    content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = ['order_id', 'product_id', 'quantity', 'unit_price_cents'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lineTotalCents(): int
    {
        return $this->quantity * $this->unit_price_cents;
    }
}
`,
  },
  {
    relPath: 'app/Models/Product.php',
    lastCommitDaysAgo: 14,
    content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\Relations\\MorphMany;

class Product extends Model
{
    protected $fillable = ['sku', 'name', 'price_cents', 'currency', 'stock'];

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function tags(): MorphMany
    {
        return $this->morphMany(Tag::class, 'taggable');
    }

    public function inStock(): bool
    {
        return $this->stock > 0;
    }
}
`,
  },
  {
    relPath: 'app/Models/Tag.php',
    lastCommitDaysAgo: 61,
    content: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class Tag extends Model
{
    protected $fillable = ['label', 'taggable_id', 'taggable_type'];

    public function taggable()
    {
        return $this->morphTo('taggable');
    }
}
`,
  },
  {
    relPath: 'app/Http/Controllers/OrderController.php',
    lastCommitDaysAgo: 1,
    content: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\Order;
use App\\Services\\OrderService;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with(['user', 'items']);
        $status = $request->query('status');
        if ($status !== null) {
            $query->where('status', $status);
        }
        return response()->json($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatePayload($request);
        $order = $this->orders->place($payload);
        return response()->json($order, 201);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json($order->load('items.product'));
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $payload = $this->validatePayload($request);
        $order->update($payload);
        return response()->json($order);
    }

    public function destroy(Order $order): JsonResponse
    {
        $order->delete();
        return response()->json(null, 204);
    }

    public function refund(Order $order): JsonResponse
    {
        return response()->json($this->orders->refund($order));
    }

    // XXX: streams the whole table into memory
    public function export(): JsonResponse
    {
        return response()->json(Order::query()->get());
    }

    private function validatePayload(Request $request): array
    {
${DUPLICATED_PHP_VALIDATION}
    }
}
`,
  },
  {
    relPath: 'app/Http/Controllers/ProductController.php',
    lastCommitDaysAgo: 7,
    content: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\Product;
use App\\Services\\PricingService;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;

class ProductController extends Controller
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json(Product::query()->orderBy('name')->paginate(100));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Product::query()->create($this->validatePayload($request)), 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $product->update($this->validatePayload($request));
        return response()->json($product);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();
        return response()->json(null, 204);
    }

    public function related(Product $product): JsonResponse
    {
        return response()->json($this->pricing->relatedTo($product));
    }

    public function stock(Request $request, Product $product): JsonResponse
    {
        $product->update(['stock' => (int) $request->input('stock', 0)]);
        return response()->json($product);
    }

    // HACK: copied from OrderController, extract into a FormRequest
    private function validatePayload(Request $request): array
    {
${DUPLICATED_PHP_VALIDATION}
    }
}
`,
  },
  {
    relPath: 'app/Http/Controllers/UserController.php',
    lastCommitDaysAgo: 22,
    content: `<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;

class UserController extends Controller
{
    public function health(): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->only(['name', 'email']));
        return response()->json($user);
    }

    // HACK: third copy of the same block, see OrderController
    private function validatePayload(Request $request): array
    {
${DUPLICATED_PHP_VALIDATION}
    }
}
`,
  },
  {
    relPath: 'app/Services/OrderService.php',
    lastCommitDaysAgo: 3,
    content: `<?php

namespace App\\Services;

use App\\Models\\Order;
use App\\Models\\OrderItem;
use App\\Support\\Money;
use Illuminate\\Support\\Facades\\DB;

class OrderService
{
    public function __construct(private readonly PricingService $pricing)
    {
    }

    public function place(array $payload): Order
    {
        return DB::transaction(function () use ($payload) {
            $order = Order::query()->create([
                'user_id' => $payload['user_id'] ?? null,
                'status' => 'pending',
                'currency' => $payload['currency'],
                'total_cents' => 0,
            ]);
            $total = 0;
            foreach ($payload['items'] ?? [] as $item) {
                $line = OrderItem::query()->create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price_cents' => $this->pricing->unitPriceCents($item),
                ]);
                $total += $line->lineTotalCents();
            }
            $order->update(['total_cents' => $total]);
            return $order->refresh();
        });
    }

    public function refund(Order $order): array
    {
        $order->update(['status' => 'refunded']);
        return [
            'order_id' => $order->id,
            'refunded' => Money::format($order->total_cents, $order->currency),
        ];
    }
}
`,
  },
  {
    relPath: 'app/Services/PricingService.php',
    lastCommitDaysAgo: 11,
    content: `<?php

namespace App\\Services;

use App\\Models\\Product;

class PricingService
{
    // TODO: read the discount ladder from configuration
    private const BULK_THRESHOLD = 10;

    public function unitPriceCents(array $item): int
    {
        $product = Product::query()->findOrFail($item['product_id']);
        $base = (int) $product->price_cents;
        if (($item['quantity'] ?? 1) >= self::BULK_THRESHOLD) {
            return (int) round($base * 0.9);
        }
        return $base;
    }

    public function relatedTo(Product $product): array
    {
        return Product::query()
            ->where('id', '!=', $product->id)
            ->orderByRaw('abs(price_cents - ?)', [$product->price_cents])
            ->limit(8)
            ->get()
            ->all();
    }
}
`,
  },
  {
    relPath: 'app/Support/Money.php',
    lastCommitDaysAgo: 55,
    content: `<?php

namespace App\\Support;

/**
 * Minor-unit money helpers. Never use floats for storage.
 */
class Money
{
    public static function format(int $cents, string $currency): string
    {
        $major = number_format($cents / 100, 2);
        return $major . ' ' . strtoupper($currency);
    }

    public static function parse(string $value): int
    {
        $clean = preg_replace('/[^0-9.\\-]/', '', $value) ?? '0';
        return (int) round(((float) $clean) * 100);
    }
}
`,
  },
  {
    relPath: 'database/migrations/2024_01_01_000100_create_users_table.php',
    lastCommitDaysAgo: 150,
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
`,
  },
  {
    relPath: 'database/migrations/2024_01_02_000100_create_products_table.php',
    lastCommitDaysAgo: 149,
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name')->index();
            $table->integer('price_cents');
            $table->string('currency', 3);
            $table->integer('stock')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
`,
  },
  {
    relPath: 'database/migrations/2024_01_03_000100_create_orders_table.php',
    lastCommitDaysAgo: 148,
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->index();
            $table->integer('total_cents');
            $table->string('currency', 3);
            $table->timestamp('placed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
`,
  },
  {
    relPath: 'database/migrations/2024_01_04_000100_create_order_items_table.php',
    lastCommitDaysAgo: 147,
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->integer('quantity');
            $table->integer('unit_price_cents');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
`,
  },
  {
    relPath: 'database/migrations/2024_01_05_000100_create_tags_table.php',
    lastCommitDaysAgo: 96,
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('label')->index();
            $table->morphs('taggable');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};
`,
  },
  {
    relPath: 'tests/Feature/OrderApiTest.php',
    lastCommitDaysAgo: 6,
    content: `<?php

namespace Tests\\Feature;

use App\\Models\\Order;
use App\\Models\\User;
use Tests\\TestCase;

class OrderApiTest extends TestCase
{
    public function test_it_lists_orders(): void
    {
        $user = User::factory()->create();
        Order::factory()->count(3)->for($user)->create();
        $response = $this->actingAs($user)->getJson('/api/orders');
        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_it_rejects_invalid_payloads(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/api/orders', []);
        $response->assertStatus(422);
    }
}
`,
  },
];

const ACME_CONSOLE_FILES: MockFile[] = [
  {
    relPath: 'package.json',
    lastCommitDaysAgo: 30,
    content: `{
  "name": "acme-console",
  "private": true,
  "version": "2.4.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.0"
  }
}
`,
  },
  {
    relPath: 'README.md',
    lastCommitDaysAgo: 45,
    content: `# acme-console

Internal operations console for the Acme storefront.

## Scripts

    npm run dev
    npm run build
    npm run test

The console talks to \`acme-api\` over REST. Set \`NEXT_PUBLIC_API_URL\` before
starting the dev server.
`,
  },
  {
    relPath: 'src/lib/types.ts',
    lastCommitDaysAgo: 21,
    content: `export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'refunded';

export interface Order {
  id: number;
  reference: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  placedAt: string;
  customerName: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
`,
  },
  {
    relPath: 'src/lib/format.ts',
    lastCommitDaysAgo: 17,
    content: `import type { OrderStatus } from './types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  refunded: 'Refunded',
};

export function formatMoney(cents: number, currency: string, locale = 'en-US'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatStatus(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

// NOTE: duplicated in StatCard while the shared package is being extracted
export function formatBytes(value: number): string {
${DUPLICATED_TS_FORMAT_BYTES}
}
`,
  },
  {
    relPath: 'src/lib/api.ts',
    lastCommitDaysAgo: 9,
    content: `import type { Order, Paginated, Product } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(BASE_URL + path, {
    headers: { accept: 'application/json' },
    ...init,
  });
  if (!response.ok) {
    throw new Error('Request failed with status ' + response.status);
  }
  return response.json();
}

export async function listOrders(status?: string): Promise<Paginated<Order>> {
  const query = status ? '?status=' + encodeURIComponent(status) : '';
  return await request('/api/orders' + query) as Paginated<Order>;
}

export async function listProducts(): Promise<Paginated<Product>> {
  return await request('/api/products') as Paginated<Product>;
}

// FIXME: no retry or abort handling on slow tenants
export async function refundOrder(id: number): Promise<Order> {
  return await request('/api/orders/' + id + '/refund', { method: 'POST' }) as Order;
}
`,
  },
  {
    relPath: 'src/hooks/useOrders.ts',
    lastCommitDaysAgo: 13,
    content: `import { useCallback, useEffect, useState } from 'react';
import { listOrders } from '../lib/api';
import type { Order } from '../lib/types';

export function useOrders(status?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listOrders(status);
      setOrders(page.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { orders, loading, error, reload };
}
`,
  },
  {
    relPath: 'src/components/Toolbar.tsx',
    lastCommitDaysAgo: 16,
    content: `import type { ReactNode } from 'react';

interface ToolbarProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function Toolbar({ title, description, actions }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="toolbar-actions">{actions}</div> : null}
    </header>
  );
}
`,
  },
  {
    relPath: 'src/components/StatCard.tsx',
    lastCommitDaysAgo: 28,
    content: `interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

// HACK: copied from lib/format to avoid a circular import
export function formatBytes(value: number): string {
${DUPLICATED_TS_FORMAT_BYTES}
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value}</strong>
      {hint ? <span className="stat-card-hint">{hint}</span> : null}
    </article>
  );
}
`,
  },
  {
    relPath: 'src/components/OrdersTable.tsx',
    lastCommitDaysAgo: 2,
    content: `import { formatMoney, formatStatus } from '../lib/format';
import type { Order } from '../lib/types';

interface OrdersTableProps {
  orders: Order[];
  onSelect: (order: Order) => void;
}

${DUPLICATED_TS_STATUS_TONES}

export function OrdersTable({ orders, onSelect }: OrdersTableProps) {
  if (orders.length === 0) {
    return <p className="empty">No orders match the current filters.</p>;
  }

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id} onClick={() => onSelect(order)}>
            <td>{order.reference}</td>
            <td>{order.customerName}</td>
            <td>{formatStatus(order.status)}</td>
            <td>{formatMoney(order.totalCents, order.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`,
  },
  {
    relPath: 'src/app/layout.tsx',
    lastCommitDaysAgo: 38,
    content: `import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'Acme Console',
  description: 'Internal operations console',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
`,
  },
  {
    relPath: 'src/app/page.tsx',
    lastCommitDaysAgo: 10,
    content: `import { StatCard } from '../components/StatCard';
import { Toolbar } from '../components/Toolbar';
import { formatMoney } from '../lib/format';

export default function DashboardPage() {
  const revenueCents = 4820500;
  const openOrders = 37;

  return (
    <main>
      <Toolbar title="Overview" description="Yesterday across every channel." />
      <section className="stat-grid">
        <StatCard label="Revenue" value={formatMoney(revenueCents, 'USD')} />
        <StatCard label="Open orders" value={String(openOrders)} hint="Awaiting fulfilment" />
        <StatCard label="Refund rate" value="1.8%" />
      </section>
    </main>
  );
}
`,
  },
  {
    relPath: 'src/app/orders/page.tsx',
    lastCommitDaysAgo: 1,
    content: `'use client';

import { useState } from 'react';
import { OrdersTable } from '../../components/OrdersTable';
import { Toolbar } from '../../components/Toolbar';
import { useOrders } from '../../hooks/useOrders';
import type { Order } from '../../lib/types';

// XXX: copied out of OrdersTable, needs a shared status module
${DUPLICATED_TS_STATUS_TONES}

export default function OrdersPage() {
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<Order | null>(null);
  const { orders, loading, error, reload } = useOrders(status || undefined);

  function handleSelect(order: Order) {
    setSelected(order);
  }

  return (
    <main>
      <Toolbar
        title="Orders"
        description={selected ? 'Selected ' + selected.reference : undefined}
        actions={<button onClick={() => void reload()}>Refresh</button>}
      />
      <select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="shipped">Shipped</option>
      </select>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading…</p> : <OrdersTable orders={orders} onSelect={handleSelect} />}
    </main>
  );
}
`,
  },
  {
    relPath: 'src/app/settings/page.tsx',
    lastCommitDaysAgo: 52,
    content: `'use client';

import { useState } from 'react';
import { Toolbar } from '../../components/Toolbar';

export default function SettingsPage() {
  const [webhook, setWebhook] = useState('');
  const [saved, setSaved] = useState(false);

  function save() {
    // TODO: persist through the settings endpoint instead of local state
    setSaved(true);
  }

  return (
    <main>
      <Toolbar title="Settings" description="Console preferences for this tenant." />
      <label>
        <span>Webhook URL</span>
        <input value={webhook} onChange={event => setWebhook(event.target.value)} />
      </label>
      <button onClick={save}>Save</button>
      {saved ? <p>Saved.</p> : null}
    </main>
  );
}
`,
  },
  {
    relPath: 'src/pages/legacy/report.tsx',
    lastCommitDaysAgo: 210,
    content: `import { formatMoney } from '../../lib/format';

// XXX: legacy pages-router screen, retire after the Q3 migration
export default function LegacyReportPage() {
  const rows = [
    { label: 'Gross', cents: 5120000 },
    { label: 'Refunds', cents: -184000 },
    { label: 'Net', cents: 4936000 },
  ];

  return (
    <table>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{formatMoney(row.cents, 'USD')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`,
  },
  {
    relPath: 'src/styles/globals.css',
    lastCommitDaysAgo: 64,
    content: `:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

.shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}
`,
  },
  {
    relPath: 'src/__tests__/format.test.ts',
    lastCommitDaysAgo: 18,
    content: `import { describe, expect, it } from 'vitest';
import { formatBytes, formatMoney, formatStatus } from '../lib/format';

describe('format', () => {
  it('formats money in minor units', () => {
    expect(formatMoney(123456, 'USD')).toContain('1,234.56');
  });

  it('formats known statuses', () => {
    expect(formatStatus('paid')).toBe('Paid');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(2048)).toBe('2.00 KB');
  });
});
`,
  },
];

export const ACME_API_PROJECT: MockProject = {
  files: ACME_API_FILES,
  repoInfo: {
    lastCommitSha: '9f4c1ab7d3e25608b1c0f4a19d77b2ee5c83a410',
    lastCommitDate: Date.now() - DAY_MS,
    remoteOriginUrl: 'git@github.com:acme/acme-api.git',
    remoteOriginWebUrl: 'https://github.com/acme/acme-api',
  },
  authors: ['Dana Whitfield', 'Rui Oliveira', 'Priya Nair', 'Tomás Alvarez'],
};

export const ACME_CONSOLE_PROJECT: MockProject = {
  files: ACME_CONSOLE_FILES,
  repoInfo: {
    lastCommitSha: '2b7e05d9c8146fa3327ee6b0d4915cc7a02f81d6',
    lastCommitDate: Date.now() - DAY_MS,
    remoteOriginUrl: 'git@github.com:acme/acme-console.git',
    remoteOriginWebUrl: 'https://github.com/acme/acme-console',
  },
  authors: ['Priya Nair', 'Jonas Berg', 'Dana Whitfield'],
};

/** Folder id → project. Folders added at runtime alternate between the two. */
export const MOCK_PROJECTS_BY_FOLDER_ID: Record<number, MockProject> = {
  1: ACME_API_PROJECT,
  2: ACME_CONSOLE_PROJECT,
  3: ACME_API_PROJECT,
};
