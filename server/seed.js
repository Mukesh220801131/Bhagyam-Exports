const connectDB = require("./config/db");
const { disconnectDB } = require("./config/db");
const Product = require("./models/Product");
const Category = require("./models/Category");
const Brand = require("./models/Brand");

const toSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

const categories = [
  {
    name: "Men",
    description: "Trendy shirts, kurtas, jeans, and ethnic wear for men — from casual street style to festive occasion wear.",
    image: "/images/E-commerce_product_image_generation_202606280006-3.jpeg",
    icon: "👔",
  },
  {
    name: "Women",
    description: "Sarees, kurtis, dresses, and western wear for every occasion — work, party, and everyday comfort.",
    image: "https://images.unsplash.com/photo-1483985988351-763728e1935b?w=600&q=80",
    icon: "👗",
  },
  {
    name: "Kids",
    description: "Comfortable, durable clothing for boys and girls — school wear, ethnic sets, and playful casuals.",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    icon: "🧒",
  },
  {
    name: "Accessories",
    description: "Bags, belts, jewellery, watches, and more to complete your look at unbeatable prices.",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    icon: "👜",
  },
  {
    name: "Footwear",
    description: "Sneakers, sandals, heels, and kolhapuris for men, women, and kids — style meets comfort.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    icon: "👟",
  },
  {
    name: "Ethnic",
    description: "Traditional Indian wear — sarees, lehengas, sherwanis, and kurta sets for weddings and festivals.",
    image: "https://images.unsplash.com/photo-1610030459662-aa6a0a8e4c3e?w=600&q=80",
    icon: "🪷",
  },
];

const brands = [
  {
    name: "FabIndia",
    description: "FabIndia is India's leading ethnic and sustainable fashion brand, offering handcrafted cotton kurtas, sarees, and home textiles rooted in Indian artisan traditions since 1960.",
    logo: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200&q=80",
    website: "https://www.fabindia.com",
    countryOfOrigin: "India",
    popularity: 4.5,
  },
  {
    name: "Biba",
    description: "Biba is a popular Indian ethnic wear brand known for vibrant prints, affordable kurtis, and fusion fashion that blends traditional motifs with contemporary silhouettes for modern women.",
    logo: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200&q=80",
    website: "https://www.biba.in",
    countryOfOrigin: "India",
    popularity: 4.4,
  },
  {
    name: "Roadster",
    description: "Roadster by Myntra is a lifestyle brand offering trendy casual wear, denim, and athleisure for men and women at value-driven price points with a focus on everyday urban style.",
    logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80",
    website: "https://www.myntra.com/roadster",
    countryOfOrigin: "India",
    popularity: 4.2,
  },
  {
    name: "Manyavar",
    description: "Manyavar is India's largest ethnic wear brand for men, specialising in sherwanis, kurta sets, and Indo-western outfits for weddings, festivals, and special celebrations nationwide.",
    logo: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
    website: "https://www.manyavar.com",
    countryOfOrigin: "India",
    popularity: 4.7,
  },
  {
    name: "Allen Solly",
    description: "Allen Solly pioneered Friday dressing in India with smart-casual shirts, chinos, and polos that bridge formal office wear and relaxed weekend style for the modern professional.",
    logo: "https://images.unsplash.com/photo-1596362537478-3f8a1d4cb5f8?w=200&q=80",
    website: "https://www.allensolly.com",
    countryOfOrigin: "India",
    popularity: 4.3,
  },
  {
    name: "Bata",
    description: "Bata India has been a trusted footwear name for generations, offering durable school shoes, formal leather pairs, and everyday sandals at accessible prices across the country.",
    logo: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&q=80",
    website: "https://www.bata.in",
    countryOfOrigin: "India",
    popularity: 4.1,
  },
  {
    name: "Campus",
    description: "Campus by Action Shoes is India's favourite sports and casual footwear brand, known for lightweight sneakers, running shoes, and trendy slip-ons popular among students and youth.",
    logo: "https://images.unsplash.com/photo-1606107557195-0a29cbf1f4b2?w=200&q=80",
    website: "https://www.campusshoes.com",
    countryOfOrigin: "India",
    popularity: 4.0,
  },
  {
    name: "Libas",
    description: "Libas offers affordable ethnic and fusion wear for women including printed kurtis, palazzo sets, and dupatta combos — a top seller on Meesho and Myntra for budget-conscious shoppers.",
    logo: "https://images.unsplash.com/photo-1583391730548-8c646e0f28f2?w=200&q=80",
    website: "https://www.libas.in",
    countryOfOrigin: "India",
    popularity: 4.2,
  },
  {
    name: "Puma",
    description: "Puma is a global sportswear giant loved in India for its stylish sneakers, track pants, and activewear that combine performance technology with street-ready aesthetics.",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80",
    website: "https://in.puma.com",
    countryOfOrigin: "Germany",
    popularity: 4.6,
  },
  {
    name: "Nike",
    description: "Nike leads the Indian sportswear market with premium running shoes, Dri-FIT apparel, and iconic Air Max sneakers favoured by athletes, gym-goers, and sneakerheads alike.",
    logo: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&q=80",
    website: "https://www.nike.com/in",
    countryOfOrigin: "USA",
    popularity: 4.8,
  },
  {
    name: "Decathlon",
    description: "Decathlon India provides quality sports gear and activewear at honest prices — from cricket kits and yoga mats to hiking jackets and cycling apparel for every fitness level.",
    logo: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&q=80",
    website: "https://www.decathlon.in",
    countryOfOrigin: "France",
    popularity: 4.5,
  },
  {
    name: "Aachho",
    description: "Aachho is a fast-growing D2C ethnic brand from Jaipur, celebrated for mirror-work lehengas, gota-patti kurtis, and festive co-ord sets that bring Rajasthani craft to modern wardrobes.",
    logo: "https://images.unsplash.com/photo-1610030459662-aa6a0a8e4c3e?w=200&q=80",
    website: "https://www.aachho.com",
    countryOfOrigin: "India",
    popularity: 4.4,
  },
];

const products = [
  // Men (6)
  {
    name: "Men Cotton Kurta — Solid Beige",
    description: "Breathable pure cotton kurta with mandarin collar and side slits. Perfect for festivals, pujas, and casual ethnic outings. Machine washable.",
    brand: "FabIndia",
    category: "Men",
    price: 1899,
    discountPrice: 1299,
    images: [
      "/images/E-commerce_product_image_generation_202606280006-3.jpeg",
      "/images/E-commerce_product_image_generation_202606280006-3.jpeg",
      "/images/E-commerce_product_image_generation_202606280006-4.jpeg",
      "/images/E-commerce_product_image_generation_202606280006-5.jpeg",

    


    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Beige", "White", "Navy"],
    stock: 45,
    rating: 4.5,
    reviews: 128,
  },
  {
    name: "Men Slim Fit Denim Jeans — Dark Wash",
    description: "Stretch denim jeans with slim taper fit and five-pocket styling. Comfortable for all-day wear with a modern Indian fit.",
    brand: "Roadster",
    category: "Men",
    price: 2199,
    discountPrice: 1499,
    images: [
      "/images/E-commerce_product_image_generation_202606280006-6.jpeg"
    ],
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: ["Dark Blue", "Black", "Light Blue"],
    stock: 60,
    rating: 4.3,
    reviews: 342,
  },
  {
    name: "Men Formal Cotton Shirt — Slim Fit",
    description: "Premium non-iron cotton shirt with spread collar. Ideal for office, interviews, and smart-casual Friday dressing.",
    brand: "Allen Solly",
    category: "Men",
    price: 1799,
    discountPrice: 1199,
    images: [
     "/images/E-commerce_product_image_generation_202606280006-5.jpeg"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Sky Blue", "Pink"],
    stock: 55,
    rating: 4.6,
    reviews: 89,
  },
  {
    name: "Men Oversized Graphic Tee",
    description: "Trendy oversized t-shirt in 220 GSM cotton with minimal streetwear print. Drop-shoulder cut for a relaxed Gen-Z fit.",
    brand: "Roadster",
    category: "Men",
    price: 999,
    discountPrice: 599,
    images: [
      "/images/Indian_male_wearing_shirt_202606280026.jpeg", 
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Olive"],
    stock: 120,
    rating: 4.2,
    reviews: 567,
  },
  {
    name: "Men Nehru Jacket — Velvet Finish",
    description: "Structured Nehru jacket with velvet fabric and mandarin collar. Elevates any kurta-pyjama or shirt-trouser combo for weddings.",
    brand: "Manyavar",
    category: "Men",
    price: 4999,
    discountPrice: 3499,
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Maroon", "Navy", "Black"],
    stock: 25,
    rating: 4.8,
    reviews: 45,
  },
  {
    name: "Men Track Pants — Quick Dry",
    description: "Lightweight polyester track pants with elastic waistband and zip pockets. Ideal for gym, jogging, and lounging at home.",
    brand: "Decathlon",
    category: "Men",
    price: 899,
    discountPrice: 649,
    images: [
      "https://images.unsplash.com/photo-1506629082632-401d14643996?w=600&q=80",
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Navy", "Grey"],
    stock: 80,
    rating: 4.4,
    reviews: 203,
  },

  // Women (6)
  {
    name: "Women Printed Anarkali Kurti Set",
    description: "Flowy Anarkali kurti with matching palazzo and dupatta. Soft rayon fabric with vibrant block print — perfect for office and casual outings.",
    brand: "Libas",
    category: "Women",
    price: 1599,
    discountPrice: 899,
    images: [
      "https://images.unsplash.com/photo-1583391730548-8c646e0f28f2?w=600&q=80",
      "https://images.unsplash.com/photo-1595777457583-95e059a581bd?w=600&q=80",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Blue Print", "Pink Print", "Green Print"],
    stock: 70,
    rating: 4.5,
    reviews: 892,
  },
  {
    name: "Women Cotton Straight Kurti",
    description: "Everyday cotton kurti with three-quarter sleeves and side slits. Breathable fabric ideal for Indian summers and daily wear.",
    brand: "Biba",
    category: "Women",
    price: 1299,
    discountPrice: 799,
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059a581bd?w=600&q=80",
      "https://images.unsplash.com/photo-1483985988351-763728e1935b?w=600&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Yellow", "White", "Peach"],
    stock: 90,
    rating: 4.6,
    reviews: 445,
  },
  {
    name: "Women High-Waist Yoga Leggings",
    description: "Four-way stretch leggings with tummy control waistband and hidden phone pocket. Squat-proof fabric for gym and yoga sessions.",
    brand: "Puma",
    category: "Women",
    price: 2499,
    discountPrice: 1799,
    images: [
      "https://images.unsplash.com/photo-1506629082968-a547bd81a202?w=600&q=80",
      "https://images.unsplash.com/photo-1518310952641-8c2d0961980b?w=600&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Black", "Navy", "Wine"],
    stock: 50,
    rating: 4.7,
    reviews: 156,
  },
  {
    name: "Women Floral Maxi Dress",
    description: "Lightweight georgette maxi dress with tiered hem and adjustable straps. A breezy pick for brunches, beach trips, and date nights.",
    brand: "Roadster",
    category: "Women",
    price: 1899,
    discountPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1595607774223-ca3f9e9532ca?w=600&q=80",
      "https://images.unsplash.com/photo-1572804013309-59a686b4e713?w=600&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Floral Pink", "Floral Blue", "Solid Black"],
    stock: 40,
    rating: 4.4,
    reviews: 78,
  },
  {
    name: "Women Mirror Work Lehenga Choli",
    description: "Stunning lehenga set with mirror embroidery, sequin work, and net dupatta. Ready for sangeet, mehendi, and festive celebrations.",
    brand: "Aachho",
    category: "Women",
    price: 5999,
    discountPrice: 4299,
    images: [
      "https://images.unsplash.com/photo-1610030459662-aa6a0a8e4c3e?w=600&q=80",
      "https://images.unsplash.com/photo-1583391730548-8c646e0f28f2?w=600&q=80",
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Pink", "Mint Green", "Royal Blue"],
    stock: 18,
    rating: 4.9,
    reviews: 34,
  },
  {
    name: "Women Denim Jacket — Cropped Fit",
    description: "Classic cropped denim jacket with button-front closure. Layer over kurtis, tees, or dresses for an effortless Indo-western look.",
    brand: "Roadster",
    category: "Women",
    price: 2199,
    discountPrice: 1599,
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
      "https://images.unsplash.com/photo-1483985988351-763728e1935b?w=600&q=80",
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Light Blue", "Dark Blue", "Black"],
    stock: 35,
    rating: 4.5,
    reviews: 112,
  },

  // Kids (5)
  {
    name: "Kids Cotton Kurta Pyjama Set",
    description: "Soft cotton kurta pyjama set for boys with contrast piping. Comfortable for festivals, family functions, and ethnic day at school.",
    brand: "FabIndia",
    category: "Kids",
    price: 1299,
    discountPrice: 899,
    images: [
      "https://images.unsplash.com/photo-1518362215217-cfab6ffb41e5?w=600&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    ],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: ["Cream", "Yellow", "Sky Blue"],
    stock: 65,
    rating: 4.7,
    reviews: 67,
  },
  {
    name: "Kids Cartoon Print T-Shirt Pack of 3",
    description: "Pack of three 100% cotton tees with fun cartoon prints. Soft on skin, colour-fast, and perfect for daily school and playtime wear.",
    brand: "Libas",
    category: "Kids",
    price: 899,
    discountPrice: 549,
    images: [
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    ],
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    colors: ["Multi Print"],
    stock: 100,
    rating: 4.4,
    reviews: 234,
  },
  {
    name: "Kids Fleece Hoodie — Unisex",
    description: "Warm fleece-lined hoodie with kangaroo pocket and drawstring hood. Unisex design suitable for boys and girls during winter.",
    brand: "Decathlon",
    category: "Kids",
    price: 999,
    discountPrice: 749,
    images: [
      "https://images.unsplash.com/photo-1551597221-d91b58e0bbad?w=600&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    ],
    sizes: ["3-4Y", "5-6Y", "7-8Y", "9-10Y"],
    colors: ["Red", "Navy", "Grey"],
    stock: 55,
    rating: 4.6,
    reviews: 89,
  },
  {
    name: "Kids School Uniform Set",
    description: "Complete school uniform with half-sleeve shirt and adjustable waist trousers. Durable poly-cotton blend, easy to iron.",
    brand: "Bata",
    category: "Kids",
    price: 1199,
    discountPrice: 799,
    images: [
      "https://images.unsplash.com/photo-1518362215217-cfab6ffb41e5?w=600&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    ],
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"],
    colors: ["White/Navy", "White/Grey"],
    stock: 75,
    rating: 4.5,
    reviews: 156,
  },
  {
    name: "Kids Sports Shorts & Tee Combo",
    description: "Breathable polyester sports set with moisture-wicking tee and elastic shorts. Great for PE class, cricket practice, and outdoor play.",
    brand: "Nike",
    category: "Kids",
    price: 1899,
    discountPrice: 1299,
    images: [
      "https://images.unsplash.com/photo-1506629082584-c8e16c948e69?w=600&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80",
    ],
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    colors: ["Black/Orange", "Blue/White"],
    stock: 40,
    rating: 4.8,
    reviews: 42,
  },

  // Accessories (5)
  {
    name: "Women Jhumka Earrings — Oxidised Silver",
    description: "Traditional oxidised silver jhumka earrings with intricate filigree work. Lightweight and hypoallergenic — pairs beautifully with ethnic wear.",
    brand: "Aachho",
    category: "Accessories",
    price: 599,
    discountPrice: 349,
    images: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80",
    ],
    sizes: ["One Size"],
    colors: ["Silver", "Gold Tone"],
    stock: 150,
    rating: 4.6,
    reviews: 678,
  },
  {
    name: "Unisex Canvas Backpack — 25L",
    description: "Spacious 25-litre backpack with padded laptop sleeve, water bottle pocket, and adjustable straps. Ideal for college and daily commute.",
    brand: "Roadster",
    category: "Accessories",
    price: 1499,
    discountPrice: 999,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
      "https://images.unsplash.com/photo-1622560480605-d83c853a5c2c?w=600&q=80",
    ],
    sizes: ["Standard"],
    colors: ["Black", "Olive", "Navy"],
    stock: 45,
    rating: 4.3,
    reviews: 189,
  },
  {
    name: "Men Genuine Leather Belt",
    description: "Full-grain leather belt with brushed metal buckle. Reversible black/brown design — one belt for formal and casual outfits.",
    brand: "Allen Solly",
    category: "Accessories",
    price: 1299,
    discountPrice: 899,
    images: [
      "https://images.unsplash.com/photo-1508693926297-1d71f27dd72f?w=600&q=80",
      "https://images.unsplash.com/photo-1624222247344-550fb6053f9?w=600&q=80",
    ],
    sizes: ["32", "34", "36", "38", "40"],
    colors: ["Black/Brown"],
    stock: 60,
    rating: 4.5,
    reviews: 95,
  },
  {
    name: "Women Sling Crossbody Bag",
    description: "Compact PU leather crossbody bag with adjustable chain strap and multiple compartments. Fits phone, wallet, and essentials.",
    brand: "Biba",
    category: "Accessories",
    price: 1999,
    discountPrice: 1299,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
      "https://images.unsplash.com/photo-1584917865442-de89d76ffb69?w=600&q=80",
    ],
    sizes: ["Standard"],
    colors: ["Tan", "Black", "Maroon"],
    stock: 30,
    rating: 4.4,
    reviews: 56,
  },
  {
    name: "Unisex Aviator Sunglasses — UV400",
    description: "Classic aviator sunglasses with polarised lenses and UV400 protection. Metal frame with nose pads for all-day comfort.",
    brand: "Roadster",
    category: "Accessories",
    price: 799,
    discountPrice: 499,
    images: [
      "https://images.unsplash.com/photo-1572635196233-14f4f7870a9?w=600&q=80",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80",
    ],
    sizes: ["One Size"],
    colors: ["Gold/Green", "Silver/Blue", "Black/Grey"],
    stock: 200,
    rating: 4.2,
    reviews: 412,
  },

  // Footwear (8)
  {
    name: "Men Running Shoes — Air Cushion",
    description: "Lightweight mesh running shoes with air-cushion midsole and rubber outsole. Designed for daily jogs and gym workouts on Indian roads.",
    brand: "Campus",
    category: "Footwear",
    price: 1999,
    discountPrice: 1299,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
      "https://images.unsplash.com/photo-1606107557195-0a29cbf1f4b2?w=600&q=80",
    ],
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Black/Red", "White/Blue", "Grey/Orange"],
    stock: 85,
    rating: 4.3,
    reviews: 1203,
  },
  {
    name: "Men Formal Leather Shoes — Oxford",
    description: "Genuine leather Oxford shoes with cushioned insole and anti-slip sole. Polished finish for office, interviews, and weddings.",
    brand: "Bata",
    category: "Footwear",
    price: 3499,
    discountPrice: 2499,
    images: [
      "https://images.unsplash.com/photo-1614252239476-9643f6d8d2b4?w=600&q=80",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80",
    ],
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Black", "Brown"],
    stock: 40,
    rating: 4.5,
    reviews: 234,
  },
  {
    name: "Women Block Heel Sandals",
    description: "Elegant block heel sandals with ankle strap and cushioned footbed. Comfortable height for long wedding functions and parties.",
    brand: "Bata",
    category: "Footwear",
    price: 1799,
    discountPrice: 1199,
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80",
    ],
    sizes: ["4", "5", "6", "7", "8"],
    colors: ["Nude", "Black", "Gold"],
    stock: 55,
    rating: 4.4,
    reviews: 167,
  },
  {
    name: "Women Kolhapuri Flats — Handcrafted",
    description: "Authentic handcrafted Kolhapuri chappals with soft leather upper and durable sole. Breathable and perfect for ethnic and casual wear.",
    brand: "FabIndia",
    category: "Footwear",
    price: 1499,
    discountPrice: 999,
    images: [
      "https://images.unsplash.com/photo-1603487742961-7a1317c5d0?w=600&q=80",
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
    ],
    sizes: ["4", "5", "6", "7", "8"],
    colors: ["Tan", "Maroon", "Natural"],
    stock: 70,
    rating: 4.6,
    reviews: 89,
  },
  {
    name: "Unisex Sneakers — Classic White",
    description: "Minimalist white sneakers with PU upper and memory foam insole. Versatile street-style staple that goes with jeans, kurtas, and dresses.",
    brand: "Puma",
    category: "Footwear",
    price: 4499,
    discountPrice: 3299,
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80",
      "https://images.unsplash.com/photo-1606107557195-0a29cbf1f4b2?w=600&q=80",
    ],
    sizes: ["5", "6", "7", "8", "9", "10", "11"],
    colors: ["White", "White/Black", "White/Green"],
    stock: 65,
    rating: 4.7,
    reviews: 456,
  },
  {
    name: "Men Sports Sliders — Quick Dry",
    description: "Lightweight EVA sliders with contoured footbed and textured grip. Perfect for post-workout, poolside, and casual home wear.",
    brand: "Puma",
    category: "Footwear",
    price: 1499,
    discountPrice: 999,
    images: [
      "https://images.unsplash.com/photo-1603487742961-7a1317c5d0?w=600&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    ],
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Black", "Navy", "White"],
    stock: 90,
    rating: 4.2,
    reviews: 312,
  },
  {
    name: "Kids School Shoes — Velcro Strap",
    description: "Durable school shoes with easy velcro closure, padded collar, and scuff-resistant toe cap. Approved for most Indian school dress codes.",
    brand: "Bata",
    category: "Footwear",
    price: 1299,
    discountPrice: 899,
    images: [
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80",
    ],
    sizes: ["11C", "12C", "13C", "1Y", "2Y", "3Y"],
    colors: ["Black", "Brown"],
    stock: 100,
    rating: 4.5,
    reviews: 445,
  },
  {
    name: "Men Mojari Jutti — Embroidered",
    description: "Hand-embroidered mojari jutti with cushioned insole. Traditional Punjabi footwear that pairs with sherwanis, kurtas, and Indo-western outfits.",
    brand: "Manyavar",
    category: "Footwear",
    price: 2499,
    discountPrice: 1799,
    images: [
      "https://images.unsplash.com/photo-1603487742961-7a1317c5d0?w=600&q=80",
      "https://images.unsplash.com/photo-1614252239476-9643f6d8d2b4?w=600&q=80",
    ],
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Gold", "Maroon", "Cream"],
    stock: 35,
    rating: 4.8,
    reviews: 78,
  },
];

const assertSeedData = () => {
  const expectedCounts = [
    ["categories", categories.length, 6],
    ["brands", brands.length, 12],
    ["products", products.length, 30],
  ];

  expectedCounts.forEach(([label, actual, expected]) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} ${label}, found ${actual}`);
    }
  });

  const categorySlugs = new Set(categories.map((category) => toSlug(category.name)));
  const brandNames = new Set(brands.map((brand) => brand.name));

  products.forEach((product) => {
    if (!categorySlugs.has(toSlug(product.category))) {
      throw new Error(`Product "${product.name}" has unknown category "${product.category}"`);
    }

    if (!brandNames.has(product.brand)) {
      throw new Error(`Product "${product.name}" has unknown brand "${product.brand}"`);
    }
  });
};

const upsertMany = async (Model, docs, key) => {
  if (docs.length === 0) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };

  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { [key]: doc[key] },
      update: { $set: doc },
      upsert: true,
    },
  }));

  return Model.bulkWrite(operations, { ordered: true });
};

const importData = async () => {
  let exitCode = 0;

  try {
    assertSeedData();
    await connectDB();

    const preparedCategories = categories.map((category) => ({
      ...category,
      slug: toSlug(category.name),
    }));

    const preparedBrands = brands.map((brand) => ({
      ...brand,
      slug: toSlug(brand.name),
    }));

    const preparedProducts = products.map((product, index) => {
      const nameLower = (product.name || "").toLowerCase();
      const descLower = (product.description || "").toLowerCase();
      const catLower = (product.category || "").toLowerCase();
      const text = nameLower + " " + descLower;

      // gender
      let gender = "";
      if (nameLower.includes("women") || nameLower.includes("girls") || catLower === "women") {
        gender = "Women";
      } else if (nameLower.includes("men") || nameLower.includes("boys") || catLower === "men") {
        gender = "Men";
      } else if (nameLower.includes("kids") || nameLower.includes("child") || catLower === "kids") {
        gender = "Kids";
      } else {
        gender = "Unisex";
      }

      // productType
      let productType = "";
      if (nameLower.includes("hoodie")) productType = "hoodie";
      else if (nameLower.includes("t-shirt") || nameLower.includes(" tee") || nameLower.includes("graphic tee")) productType = "t-shirt";
      else if (nameLower.includes("shirt")) productType = "shirt";
      else if (nameLower.includes("polo")) productType = "polo";
      else if (nameLower.includes("kurta") || nameLower.includes("kurti")) productType = "kurta";
      else if (nameLower.includes("jeans")) productType = "jeans";
      else if (nameLower.includes("trousers")) productType = "trousers";
      else if (nameLower.includes("jacket")) productType = "jacket";
      else if (nameLower.includes("shorts")) productType = "shorts";
      else if (nameLower.includes("dress")) productType = "dress";
      else if (nameLower.includes("sneakers") || nameLower.includes("shoes") || nameLower.includes("jutti") || nameLower.includes("mojari")) productType = "footwear";

      // sleeveType
      let sleeveType = "";
      if (text.includes("short sleeve")) sleeveType = "short sleeve";
      else if (text.includes("long sleeve")) sleeveType = "long sleeve";
      else if (text.includes("sleeveless")) sleeveType = "sleeveless";
      else if (text.includes("full sleeve")) sleeveType = "full sleeve";
      else if (text.includes("half sleeve")) sleeveType = "half sleeve";

      // fit
      let fit = "";
      if (text.includes("oversized")) fit = "oversized";
      else if (text.includes("slim fit")) fit = "slim fit";
      else if (text.includes("regular fit")) fit = "regular fit";
      else if (text.includes("relaxed fit")) fit = "relaxed fit";

      // material
      let material = "";
      if (text.includes("cotton")) material = "cotton";
      else if (text.includes("linen")) material = "linen";
      else if (text.includes("rayon")) material = "rayon";
      else if (text.includes("polyester")) material = "polyester";
      else if (text.includes("denim")) material = "denim";

      // color
      let color = "";
      if (nameLower.includes("pink")) color = "pink";
      else if (nameLower.includes("blue")) color = "blue";
      else if (nameLower.includes("black")) color = "black";
      else if (nameLower.includes("white")) color = "white";
      else if (nameLower.includes("green")) color = "green";
      else if (nameLower.includes("beige")) color = "beige";
      else if (product.colors && product.colors.length > 0) {
        color = product.colors[0].toLowerCase();
      }

      return {
        ...product,
        isActive: true,
        isFeatured: product.isFeatured ?? index < 8,
        gender: product.gender || gender,
        productType,
        sleeveType,
        fit,
        material,
        color,
        tags: product.tags || [catLower, (product.brand || "").toLowerCase()]
      };
    });

    const [categoryResult, brandResult, productResult] = await Promise.all([
      upsertMany(Category, preparedCategories, "slug"),
      upsertMany(Brand, preparedBrands, "slug"),
      upsertMany(Product, preparedProducts, "name"),
    ]);

    const [categoryCount, brandCount, productCount] = await Promise.all([
      Category.countDocuments({ slug: { $in: preparedCategories.map((category) => category.slug) } }),
      Brand.countDocuments({ slug: { $in: preparedBrands.map((brand) => brand.slug) } }),
      Product.countDocuments({
        isActive: true,
        name: { $in: preparedProducts.map((product) => product.name) },
      }),
    ]);

    const productCategories = [...new Set(preparedProducts.map((product) => product.category))];
    const productBrands = [...new Set(preparedProducts.map((product) => product.brand))];

    console.log("\nDatabase seeding completed!\n");
    console.log(`Categories ready: ${categoryCount}/6`);
    console.log(`Brands ready: ${brandCount}/12`);
    console.log(`Products ready: ${productCount}/30`);
    console.log(
      `Upsert summary: categories ${categoryResult.upsertedCount} inserted, brands ${brandResult.upsertedCount} inserted, products ${productResult.upsertedCount} inserted`
    );
    console.log(`Product categories: ${productCategories.join(", ")}`);
    console.log(`Product brands: ${productBrands.join(", ")}`);
    console.log("\nRun 'node createAdmin.js' to create admin user when Module 7 starts.");
  } catch (error) {
    exitCode = 1;
    console.error("Error seeding database:", error.message);
    if (error.errors) {
      Object.values(error.errors).forEach((err) => console.error(`  - ${err.message}`));
    }
  } finally {
    await disconnectDB();
    process.exit(exitCode);
  }
};

importData();
