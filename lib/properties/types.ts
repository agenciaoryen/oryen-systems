// lib/properties/types.ts

export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'rural' | 'other'
export type TransactionType = 'sale' | 'rent' | 'sale_or_rent'
export type PropertyStatus = 'draft' | 'active' | 'sold' | 'rented' | 'inactive'

export interface PropertyImage {
  url: string
  order: number
  caption?: string
  is_cover?: boolean
}

export interface Property {
  id: string
  org_id: string
  title: string
  description: string | null
  slug: string | null
  property_type: PropertyType
  transaction_type: TransactionType
  price: number | null
  condo_fee: number | null
  iptu: number | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  latitude: number | null
  longitude: number | null
  bedrooms: number
  suites: number
  bathrooms: number
  parking_spots: number
  total_area: number | null
  private_area: number | null
  amenities: string[]
  images: PropertyImage[]
  video_url: string | null
  virtual_tour_url: string | null
  status: PropertyStatus
  is_featured: boolean
  external_code: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export type PropertyCreate = Omit<Property, 'id' | 'created_at' | 'updated_at' | 'published_at'>
export type PropertyUpdate = Partial<Omit<Property, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
