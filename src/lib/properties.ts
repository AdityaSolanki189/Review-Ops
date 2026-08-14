export interface PropertySeed {
    slug: string
    name: string
    bookingUrl: string
    bookingPropertyId: string
}

export const PROPERTY_SEEDS: PropertySeed[] = [
    {
        slug: 'central-sydney',
        name: 'Azzurro Pod Hotel - Central Sydney',
        bookingUrl: 'https://www.booking.com/hotel/au/venus-surry-hills.html',
        bookingPropertyId: 'venus-surry-hills',
    },
    {
        slug: 'potts-point',
        name: 'Azzurro Pod Hotel - Potts Point',
        bookingUrl: 'https://www.booking.com/hotel/au/azzurro-pod-potts-point.html',
        bookingPropertyId: 'azzurro-pod-potts-point',
    },
    {
        slug: 'darling-harbour',
        name: 'Azzurro Pod Hotel - Darling Harbour',
        bookingUrl: 'https://www.booking.com/hotel/au/azzurro-pod-darling-harbour.html',
        bookingPropertyId: 'azzurro-pod-darling-harbour',
    },
    {
        slug: 'olympic-paddington',
        name: 'Olympic Hotel Paddington',
        bookingUrl: 'https://www.booking.com/hotel/au/olympic-hotel-paddington.html',
        bookingPropertyId: 'olympic-hotel-paddington',
    },
]
