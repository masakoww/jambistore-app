import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

// GET all categories
export async function GET() {
  try {
    const categoriesSnapshot = await adminDb
      .collection('categories')
      .orderBy('order', 'asc')
      .get()

    const categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ ok: true, categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST create new category
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, description, icon } = body

    if (!name || !slug) {
      return NextResponse.json(
        { ok: false, message: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingCategory = await adminDb
      .collection('categories')
      .where('slug', '==', slug)
      .limit(1)
      .get()

    if (!existingCategory.empty) {
      return NextResponse.json(
        { ok: false, message: 'Category with this slug already exists' },
        { status: 400 }
      )
    }

    // Get total categories for order
    const categoriesSnapshot = await adminDb.collection('categories').get()
    const order = categoriesSnapshot.size

    const categoryData = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      // Icon is optional; if not provided, we simply omit it
      ...(icon ? { icon } : {}),
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await adminDb.collection('categories').add(categoryData)

    return NextResponse.json({
      ok: true,
      message: 'Category created successfully',
      category: { id: docRef.id, ...categoryData },
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { ok: false, message: 'Failed to create category' },
      { status: 500 }
    )
  }
}
