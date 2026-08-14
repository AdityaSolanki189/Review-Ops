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
        bookingUrl:
            'https://www.booking.com/hotel/au/venus-surry-hills.html?aid=304142&label=gen173nr-10CAEoggI46AdIM1gEaA-IAQGYATO4ARnIAQzYAQPoAQH4AQGIAgGoAgG4Apens9EGwAIB0gIkYzY2ZjcwMTgtNWIyMS00M2FhLWE5YWQtMjM2MWU0MTM0OTIx2AIB4AIB&sid=218ac9c8ea79834d1d13fad1cbbffc72&dest_id=9888182&dest_type=hotel&dist=0&group_adults=2&group_children=0&hapos=1&hpos=1&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&srepoch=1781322760&srpvid=c63f1b4383770687&type=total&ucfs=1&',
        bookingPropertyId: 'venus-surry-hills',
    },
    {
        slug: 'potts-point',
        name: 'Azzurro Pod Hotel - Potts Point',
        bookingUrl:
            'https://www.booking.com/hotel/au/venus-potts-point-sydney.html?label=gen173nr-10CAEoggI46AdIM1gEaA-IAQGYATO4ARnIAQzYAQPoAQH4AQGIAgGoAgG4Apens9EGwAIB0gIkYzY2ZjcwMTgtNWIyMS00M2FhLWE5YWQtMjM2MWU0MTM0OTIx2AIB4AIB&aid=304142&ucfs=1&arphpl=1&dest_id=9491412&dest_type=hotel&group_adults=2&req_adults=2&no_rooms=1&group_children=0&req_children=0&hpos=1&hapos=1&sr_order=popularity&srpvid=44811b3572760679&srepoch=1781322731&from=searchresults',
        bookingPropertyId: 'azzurro-pod-potts-point',
    },
    {
        slug: 'darling-harbour',
        name: 'Azzurro Pod Hotel - Darling Harbour',
        bookingUrl:
            'https://www.booking.com/hotel/au/chateau-de-venus.html?aid=304142&label=gen173nr-10CAEoggI46AdIM1gEaA-IAQGYATO4ARnIAQzYAQPoAQH4AQGIAgGoAgG4Apens9EGwAIB0gIkYzY2ZjcwMTgtNWIyMS00M2FhLWE5YWQtMjM2MWU0MTM0OTIx2AIB4AIB&sid=218ac9c8ea79834d1d13fad1cbbffc72&dest_id=10753881&dest_type=hotel&dist=0&group_adults=2&group_children=0&hapos=1&hpos=1&no_rooms=1&req_adults=2&req_children=0&room1=A%2CA&sb_price_type=total&sr_order=popularity&srepoch=1781322793&srpvid=ec9f1b54af8103d2&type=total&ucfs=1&',
        bookingPropertyId: 'azzurro-pod-darling-harbour',
    },
    {
        slug: 'olympic-paddington',
        name: 'Olympic Hotel Paddington',
        bookingUrl: 'https://www.booking.com/hotel/au/olympic-paddington.html',
        bookingPropertyId: 'olympic-hotel-paddington',
    },
]
