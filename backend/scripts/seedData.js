require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const TravelOffer = require('../models/TravelOffer');
const Destination = require('../models/Destination');

async function seedDatabase() {
  try {
    console.log('🌱 Starte Database Seeding...');
    
    // Verbinde zur MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reisegruppen');
    console.log('✅ MongoDB verbunden zu:', process.env.MONGODB_URI);

    // Lösche vorhandene Daten
    await TravelOffer.deleteMany({});
    await Destination.deleteMany({});
    console.log('🗑️ Alte Daten gelöscht');

    // Erstelle Admin User falls nicht vorhanden
    let adminUser = await User.findOne({ email: 'admin@tui.com' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@tui.com',
        password: 'admin123',
        name: 'TUI Admin',
        role: 'admin',
        profile: {
          firstName: 'TUI',
          lastName: 'Admin'
        }
      });
      console.log('👤 Admin User erstellt');
    }

    // Erstelle Demo User falls nicht vorhanden
    let demoUser = await User.findOne({ email: 'demo@tui.com' });
    if (!demoUser) {
      demoUser = await User.create({
        email: 'demo@tui.com',
        password: 'demo123',
        name: 'Demo User',
        role: 'user',
        profile: {
          firstName: 'Demo',
          lastName: 'User'
        }
      });
      console.log('👤 Demo User erstellt');
    }

    // Erstelle Destinations mit gültigen Tags
    // Erlaubte Destination Tags: ['beach', 'city', 'mountains', 'culture', 'adventure', 'relaxation', 'party', 'family', 'romantic', 'budget', 'luxury']
    const destinations = await Destination.create([
      {
        name: 'Toskana',
        country: 'Italien',
        city: 'Florenz',
        description: 'Malerische Landschaft mit Weinbergen und historischen Städten',
        images: ['https://source.unsplash.com/800x600?tuscany'],
        avgPricePerPerson: 800,
        tags: ['culture', 'relaxation', 'romantic'],
        coordinates: { lat: 43.7711, lng: 11.2486 }
      },
      {
        name: 'Tromsø',
        country: 'Norwegen',
        city: 'Tromsø',
        description: 'Nordlichter und arktische Abenteuer',
        images: ['https://source.unsplash.com/800x600?norway,northern-lights'],
        avgPricePerPerson: 1200,
        tags: ['adventure', 'mountains'],
        coordinates: { lat: 69.6492, lng: 18.9553 }
      },
      {
        name: 'Kykladen',
        country: 'Griechenland',
        city: 'Santorini',
        description: 'Traumhafte griechische Inseln mit weißen Häusern',
        images: ['https://source.unsplash.com/800x600?santorini'],
        avgPricePerPerson: 900,
        tags: ['beach', 'relaxation', 'romantic'],
        coordinates: { lat: 36.3932, lng: 25.4615 }
      },
      {
        name: 'Barcelona',
        country: 'Spanien',
        city: 'Barcelona',
        description: 'Lebendige Metropole mit Kultur und Kulinarik',
        images: ['https://source.unsplash.com/800x600?barcelona'],
        avgPricePerPerson: 600,
        tags: ['city', 'culture'],
        coordinates: { lat: 41.3851, lng: 2.1734 }
      },
      {
        name: 'Tirol',
        country: 'Österreich',
        city: 'Innsbruck',
        description: 'Bergwelt und Wanderparadies',
        images: ['https://source.unsplash.com/800x600?alps,austria'],
        avgPricePerPerson: 700,
        tags: ['mountains', 'adventure'],
        coordinates: { lat: 47.2692, lng: 11.4041 }
      }
    ]);
    console.log(`✅ ${destinations.length} Destinations erstellt`);

    // Erstelle TravelOffers mit gültigen Amenities
    // Erlaubte TravelOffer Amenities: ['WLAN', 'Pool', 'Klimaanlage', 'Spa', 'Fitness', 'Restaurant', 'Bar', 'Parkplatz', 'Haustiere', 'Strand', 'Balkon', 'Küche', 'Waschmaschine', 'TV', 'Safe', 'Minibar', 'Roomservice', 'All-Inclusive', 'Halbpension', 'Vollpension', 'Nur Frühstück']
    const travelOffers = [
      {
        title: 'Traumhafte Toskana Tour',
        description: 'Entdecken Sie die malerische Landschaft der Toskana, besuchen Sie historische Städte und genießen Sie die italienische Küche.',
        destination: 'Toskana',
        country: 'Italien',
        city: 'Florenz',
        category: 'Hotel',
        images: [
          {
            url: 'https://source.unsplash.com/800x600?tuscany,wine',
            title: 'Toskana Weinberge',
            isMain: true
          },
          {
            url: 'https://source.unsplash.com/800x600?florence,italy',
            title: 'Florenz Stadtansicht',
            isMain: false
          }
        ],
        pricePerPerson: 980,
        pricePerNight: 140,
        minPersons: 2,
        maxPersons: 8,
        stars: 4,
        amenities: ['WLAN', 'Pool', 'Restaurant', 'Halbpension', 'Parkplatz'],
        tags: ['culture', 'relaxation', 'romantic'],
        location: {
          latitude: 43.7711,
          longitude: 11.2486,
          address: 'Via dei Vini 12, 50125 Florenz, Italien'
        },
        cancellationPolicy: 'moderate',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        createdBy: adminUser._id,
        available: true,
        rating: {
          average: 4.8,
          count: 124
        }
      },
      {
        title: 'Nordlichter in Norwegen',
        description: 'Erleben Sie das magische Naturschauspiel der Nordlichter und entdecken Sie die atemberaubende norwegische Landschaft.',
        destination: 'Tromsø',
        country: 'Norwegen',
        city: 'Tromsø',
        category: 'Hotel',
        images: [
          {
            url: 'https://source.unsplash.com/800x600?norway,northern-lights',
            title: 'Nordlichter über Tromsø',
            isMain: true
          }
        ],
        pricePerPerson: 1450,
        pricePerNight: 290,
        minPersons: 2,
        maxPersons: 6,
        stars: 4,
        amenities: ['WLAN', 'Spa', 'Restaurant', 'Vollpension', 'Fitness'],
        tags: ['adventure', 'mountains'],
        location: {
          latitude: 69.6492,
          longitude: 18.9553,
          address: 'Arctic Hotel, Tromsø, Norwegen'
        },
        cancellationPolicy: 'moderate',
        createdBy: adminUser._id,
        available: true,
        rating: {
          average: 4.9,
          count: 87
        }
      },
      {
        title: 'Griechische Inselträume',
        description: 'Entspannen Sie auf den schönsten Inseln Griechenlands, besuchen Sie antike Stätten und genießen Sie das mediterrane Flair.',
        destination: 'Kykladen',
        country: 'Griechenland',
        city: 'Santorini',
        category: 'Resort',
        images: [
          {
            url: 'https://source.unsplash.com/800x600?santorini,greece',
            title: 'Santorini Sonnenuntergang',
            isMain: true
          }
        ],
        pricePerPerson: 1680,
        pricePerNight: 168,
        minPersons: 2,
        maxPersons: 10,
        stars: 5,
        amenities: ['WLAN', 'Pool', 'Strand', 'All-Inclusive', 'Spa'],
        tags: ['beach', 'relaxation', 'romantic'],
        location: {
          latitude: 36.3932,
          longitude: 25.4615,
          address: 'Santorini Resort, Kykladen, Griechenland'
        },
        cancellationPolicy: 'free',
        createdBy: adminUser._id,
        available: true,
        rating: {
          average: 4.7,
          count: 203
        }
      },
      {
        title: 'Spanische Tapas Tour',
        description: 'Entdecken Sie die kulinarische Vielfalt Spaniens und erleben Sie die lebendige Kultur der spanischen Metropolen.',
        destination: 'Barcelona',
        country: 'Spanien',
        city: 'Barcelona',
        category: 'Hotel',
        images: [
          {
            url: 'https://source.unsplash.com/800x600?barcelona,spain',
            title: 'Barcelona Stadtpanorama',
            isMain: true
          }
        ],
        pricePerPerson: 520,
        pricePerNight: 130,
        minPersons: 2,
        maxPersons: 8,
        stars: 4,
        amenities: ['WLAN', 'Restaurant', 'Bar', 'Halbpension', 'Klimaanlage'],
        tags: ['city', 'culture'],
        location: {
          latitude: 41.3851,
          longitude: 2.1734,
          address: 'Hotel Barcelona Centro, Barcelona, Spanien'
        },
        cancellationPolicy: 'moderate',
        createdBy: adminUser._id,
        available: true,
        rating: {
          average: 4.6,
          count: 156
        }
      },
      {
        title: 'Alpen Wanderparadies',
        description: 'Wandern Sie durch die malerische Bergwelt Tirols und genießen Sie die frische Bergluft und traditionelle Hüttengastronomie.',
        destination: 'Tirol',
        country: 'Österreich',
        city: 'Innsbruck',
        category: 'Pension',
        images: [
          {
            url: 'https://source.unsplash.com/800x600?alps,hiking',
            title: 'Alpen Wanderwege',
            isMain: true
          }
        ],
        pricePerPerson: 540,
        pricePerNight: 90,
        minPersons: 2,
        maxPersons: 12,
        stars: 3,
        amenities: ['WLAN', 'Restaurant', 'Halbpension', 'Balkon', 'Parkplatz'],
        tags: ['mountains', 'adventure'],
        location: {
          latitude: 47.2692,
          longitude: 11.4041,
          address: 'Alpenpension Tirol, Innsbruck, Österreich'
        },
        cancellationPolicy: 'moderate',
        createdBy: adminUser._id,
        available: true,
        rating: {
          average: 4.8,
          count: 98
        }
      }
    ];

    const createdOffers = await TravelOffer.create(travelOffers);
    console.log(`✅ ${createdOffers.length} TravelOffers erstellt`);

    console.log('🎉 Database Seeding erfolgreich abgeschlossen!');
    console.log(`📊 Erstellte Daten:
    - ${destinations.length} Destinations
    - ${createdOffers.length} Travel Offers
    - 2 Test Users (admin@tui.com / demo@tui.com)`);

    // Zeige Beispiele der erstellten Angebote
    console.log('\n📋 Erstellte Reiseangebote:');
    createdOffers.forEach((offer, index) => {
      console.log(`   ${index + 1}. ${offer.title} - ${offer.destination} (€${offer.pricePerPerson})`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Datenbankverbindung geschlossen');
    process.exit(0);
  }
}

// Führe Seeding aus
seedDatabase();