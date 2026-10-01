/**
 * menuDataHelpers.js — Menu data extraction & curated archetype menus for print cards
 */

export const ARCHETYPE_SAMPLE_MENUS = {
  cafe_artisan: {
    tagline: 'SPECIALTY COFFEE • ARTISANAL BAKERY • LIGHT FARE',
    currency: 'Br',
    categories: [
      {
        name: 'Espresso & Hand-Brew',
        icon: '☕',
        items: [
          { name: 'Espresso Macchiato', price: 95, desc: 'Double shot Ethiopian heirloom espresso with velvety microfoam', tag: 'House Fav' },
          { name: 'Yirgacheffe V60 Pour-over', price: 140, desc: 'Single origin light roast with jasmine, bergamot, and peach notes', tag: 'Single Origin' },
          { name: 'Spanish Honey Latte', price: 150, desc: 'Silky steamed milk, espresso, and organic raw highland blossom honey', tag: null },
          { name: 'Nitro Cold Brew', price: 135, desc: 'Steeped for 18 hours, infused with nitrogen for a Guinness-like creaminess', tag: 'Cold' },
        ],
      },
      {
        name: 'Artisanal Bakery & Toast',
        icon: '🥐',
        items: [
          { name: 'Pistachio Cruffin', price: 180, desc: 'Flaky croissant pastry filled with house-made Sicilian pistachio cream', tag: 'Fresh Baked' },
          { name: 'Almond Twice-Baked Croissant', price: 160, desc: 'Frangipane filling topped with toasted sliced almonds and powdered sugar', tag: null },
          { name: 'Avocado Tartine on Sourdough', price: 240, desc: 'Mashed Hass avocado, heirloom radish, feta, dukkah, and chili flakes', tag: 'Vegetarian' },
          { name: 'Brioche French Toast', price: 260, desc: 'Caramelized banana, wild berry compote, whipped mascarpone, pure maple', tag: 'Sweet' },
        ],
      },
      {
        name: 'All-Day Brunch Bowls',
        icon: '🍳',
        items: [
          { name: 'Shakshuka Skillet', price: 290, desc: 'Two farm eggs poached in spiced tomato-pepper ragout with warm focaccia', tag: 'Signature' },
          { name: 'Smoked Salmon Benedict', price: 340, desc: 'Poached organic eggs, smoked Norwegian salmon, tarragon hollandaise', tag: 'Chef Choice' },
          { name: 'Golden Granola Acai Bowl', price: 220, desc: 'Whipped Greek yogurt, house nut granola, chia seeds, passionfruit drizzle', tag: 'Superfood' },
        ],
      },
      {
        name: 'Signature Teas & Chillers',
        icon: '🍵',
        items: [
          { name: 'Ceremonial Uji Matcha Latte', price: 175, desc: 'First harvest stone-ground Japanese green tea with oat milk', tag: 'Organic' },
          { name: 'Hibiscus Rose Sparkler', price: 130, desc: 'Cold brew organic hibiscus, crushed mint, lime, and sparkling soda', tag: 'Refreshing' },
          { name: 'Spiced Chai Latte', price: 145, desc: 'Slow simmered black tea, fresh ginger, cardamom, cinnamon, and steamed milk', tag: null },
        ],
      },
    ],
  },

  fast_casual: {
    tagline: 'SMASH BURGERS • CRISPY CRUST PIZZA • STREET SIDES',
    currency: 'Br',
    categories: [
      {
        name: 'Smash Burgers & Buns',
        icon: '🍔',
        items: [
          { name: 'Double Truffle Smash', price: 280, desc: 'Twin smashed beef patties, aged cheddar, caramelized onions, black truffle aioli', tag: 'Best Seller' },
          { name: 'Spicy Nashville Hot Chicken', price: 260, desc: 'Crispy fried buttermilk breast, habanero dust, vinegar slaw, sweet pickles', tag: 'Hot 🔥' },
          { name: 'Classic Street Cheeseburger', price: 210, desc: 'Smashed patty, American cheese, secret street sauce, toasted potato bun', tag: null },
          { name: 'Smoky BBQ Bacon Melt', price: 290, desc: 'Crispy bacon, onion rings, smoked cheddar, house hickory bourbon BBQ sauce', tag: 'Heavy' },
        ],
      },
      {
        name: 'Stone-Baked Street Pizza',
        icon: '🍕',
        items: [
          { name: 'Hot Honey Pepperoni', price: 360, desc: 'Crispy cupping pepperoni, mozzarella, crushed San Marzano, chili hot honey', tag: 'Top Rated' },
          { name: 'Garlic Chicken & Pesto', price: 380, desc: 'Charred chicken, basil pesto, cherry tomatoes, ricotta, toasted pine nuts', tag: null },
          { name: 'Four Cheese Supreme', price: 340, desc: 'Mozzarella, fontina, gorgonzola, parmesan reggiano, fresh oregano', tag: 'Cheesy' },
        ],
      },
      {
        name: 'Loaded Sides & Wings',
        icon: '🍟',
        items: [
          { name: 'Truffle Parmesan Hand-Cut Fries', price: 160, desc: 'Skin-on Idaho russets, white truffle oil, grated parmesan, fresh parsley', tag: 'Crispy' },
          { name: 'Crispy Buffalo Wings (8pcs)', price: 290, desc: 'Classic tangy hot sauce, celery sticks, and house-made blue cheese dip', tag: 'Spicy' },
          { name: 'Loaded Street Nachos', price: 240, desc: 'Warm tortilla chips, melted queso, pico de gallo, jalapeños, guacamole', tag: 'Shareable' },
        ],
      },
      {
        name: 'Thick Shakes & Coolers',
        icon: '🥤',
        items: [
          { name: 'Salted Caramel Pretzel Shake', price: 160, desc: 'Vanilla custard, salted butter caramel ribbon, crushed pretzels, whipped cream', tag: 'Sweet' },
          { name: 'Classic Oreo Overload', price: 150, desc: 'Double stuffed Oreos spun into thick chocolate-vanilla dairy ice cream', tag: null },
          { name: 'House Berry Lemonade', price: 90, desc: 'Fresh squeezed lemons, wild strawberry purée, crushed ice, mint leaf', tag: 'Ice Cold' },
        ],
      },
    ],
  },

  fresh_mart: {
    tagline: 'ORGANIC HARVEST • ARTISAN DELI • COLD-PRESSED JUICES',
    currency: 'Br',
    categories: [
      {
        name: 'Superfood Harvest Bowls',
        icon: '🥗',
        items: [
          { name: 'Mediterranean Quinoa Crunch', price: 260, desc: 'Herb quinoa, roasted chickpeas, kalamata olives, cucumber, lemon tahini', tag: 'Vegan 🌱' },
          { name: 'Wild Salmon & Avocado Power Bowl', price: 380, desc: 'Pan-seared salmon, edamame, organic brown rice, seaweed, sesame ginger glaze', tag: 'Protein' },
          { name: 'Crispy Falafel Harvest Plate', price: 240, desc: 'Spiced herb falafel, roasted beetroot hummus, heirloom tabbouleh, warm pita', tag: 'Gluten-Free' },
          { name: 'Grilled Halloumi & Roasted Veg', price: 290, desc: 'Warm Cypriot halloumi, zucchini, bell peppers, pomegranate molasses, arugula', tag: 'Organic' },
        ],
      },
      {
        name: 'Artisan Deli Sandwiches',
        icon: '🥪',
        items: [
          { name: 'Roasted Turkey & Cranberry Panini', price: 290, desc: 'Herb-roasted turkey breast, brie cheese, cranberry spread, pressed ciabatta', tag: 'Deli Pick' },
          { name: 'Caprese Focaccia Melt', price: 230, desc: 'Buffalo mozzarella, heirloom beefsteak tomatoes, fresh basil, aged balsamic', tag: 'Vegetarian' },
          { name: 'Smoked Pastrami on Rye', price: 320, desc: 'House-cured beef pastrami, Swiss cheese, sauerkraut, spicy Dijon mustard', tag: 'Artisan' },
        ],
      },
      {
        name: 'Cold-Pressed Raw Elixirs',
        icon: '🧃',
        items: [
          { name: 'Green Vitality Cleanse', price: 140, desc: 'Kale, spinach, green apple, cucumber, celery, fresh ginger, and lemon', tag: 'Cold-Pressed' },
          { name: 'Golden Turmeric Immunity Glow', price: 150, desc: 'Pineapple, raw turmeric root, ginger, orange, and cracked black pepper', tag: 'Wellness' },
          { name: 'Ruby Beet Energy Boost', price: 140, desc: 'Organic beetroot, red apple, pomegranate, carrot, and key lime juice', tag: 'Raw' },
        ],
      },
      {
        name: 'Acai & Superfood Smoothies',
        icon: '🍓',
        items: [
          { name: 'Pure Amazon Acai Bowl', price: 240, desc: 'Organic blended acai, banana, homemade almond granola, chia seeds, berries', tag: 'Superfood' },
          { name: 'Peanut Butter Protein Blast', price: 180, desc: 'Banana, organic peanut butter, plant protein, cacao nibs, almond milk', tag: '30g Protein' },
        ],
      },
    ],
  },

  luxury_hotel: {
    tagline: 'HAUTE CUISINE • SOMMELIER SELECTION • REFINED HOSPITALITY',
    currency: 'Br',
    categories: [
      {
        name: 'Premier Tasting Entrées',
        icon: '⚜️',
        items: [
          { name: 'Pan-Seared Hokkaido Scallops', price: 580, desc: 'Cauliflower mousseline, Oscietra caviar, brown butter caper emulsion, samphire', tag: 'Signature' },
          { name: 'Wagyu Beef Tartare & Bone Marrow', price: 520, desc: 'Hand-cut prime beef, cured quail egg yolk, black truffle shavings, toasted brioche', tag: 'Chef Course' },
          { name: 'Velouté of Forest Mushrooms', price: 380, desc: 'Wild chanterelles, porcini broth, aged parmesan crisp, cold-pressed white truffle oil', tag: 'Vegetarian' },
        ],
      },
      {
        name: 'Grand Executive Mains',
        icon: '🍽️',
        items: [
          { name: 'Charcoal-Grilled Prime Angus Ribeye', price: 890, desc: '45-day dry-aged beef, pomme purée, charred shallots, Périgord truffle jus', tag: 'Prime Cut' },
          { name: 'Roasted Chilean Sea Bass', price: 820, desc: 'Pan-glazed fish, saffron lemongrass bouillon, baby bok choy, beluga lentils', tag: 'Ocean Fresh' },
          { name: 'Spiced Duck Breast à l’Orange', price: 740, desc: 'Crispy skin Magret duck, caramelized heirloom carrots, Grand Marnier reduction', tag: 'Classic' },
          { name: 'Saffron Lobster Tagliolini', price: 780, desc: 'Handmade fresh pasta, poached Atlantic lobster tail, bisque reduction, chives', tag: 'Haute' },
        ],
      },
      {
        name: 'Artisanal Cheeses & Sides',
        icon: '🧀',
        items: [
          { name: 'Affiné French Cheese Board', price: 460, desc: 'Comté 24-month, Roquefort, Brie de Meaux, honeycomb, fig walnut crisps', tag: 'Selection' },
          { name: 'Truffled Potato Mousseline', price: 240, desc: 'Whipped French butter potatoes, shaved fresh black truffles, chives', tag: null },
          { name: 'Charred Asparagus & Hollandaise', price: 260, desc: 'Jumbo green asparagus, citrus sabayon, toasted almond flakes', tag: null },
        ],
      },
      {
        name: 'Haute Patisserie & Cellar',
        icon: '🍷',
        items: [
          { name: 'Valrhona Grand Cru Dark Fondant', price: 380, desc: '70% Guanaja molten core chocolate cake, Madagascar vanilla bean gelato', tag: 'Dessert' },
          { name: 'Classic Tahitian Vanilla Mille-Feuille', price: 340, desc: 'Caramelized puff pastry, diplomat cream, passionfruit raspberry coulis', tag: null },
          { name: 'Grand Cru Sommelier Wine Pairing', price: 490, desc: 'Curated 3-glass selection paired to your dining journey', tag: 'Cellar' },
        ],
      },
    ],
  },

  cultural_heritage: {
    tagline: 'AUTHENTIC ETHIOPIAN CUISINE • BUNA CEREMONY • TEJ',
    currency: 'Br',
    categories: [
      {
        name: 'Traditional Tibs & Siga (ስጋና ጥብስ)',
        icon: '🥩',
        items: [
          { name: 'Special Derek Tibs (ደረቅ ጥብስ)', price: 450, desc: 'Tender cubed prime beef flash-fried on hot clay skillet with rosemary, onions, and jalapeños', tag: 'House Special' },
          { name: 'Awaze Tibs be Kibe (አዋዜ ጥብስ)', price: 430, desc: 'Succulent beef simmered in spiced niter kibbeh (clarified butter) and fiery authentic awaze sauce', tag: 'Spicy 🔥' },
          { name: 'Zilzil Tibs (ዝልዝል ጥብስ)', price: 480, desc: 'Long-cut marinated beef strips seared on a sizzling iron plate, served with mitmita dip', tag: 'Sizzling' },
          { name: 'Doro Wot with Hard-Boiled Egg (ዶሮ ወጥ)', price: 490, desc: 'Slow-simmered chicken drumstick in fragrant berbere sauce with caramelized onions and egg', tag: 'Cultural Classic' },
        ],
      },
      {
        name: 'Kitfo & Gursha Platters (ክትፎ)',
        icon: '🍲',
        items: [
          { name: 'Special Kitfo be Ayib & Gomen (ልዩ ክትፎ)', price: 480, desc: 'Finely minced lean beef infused with purified niter kibbeh, mitmita, cottage cheese, and collard greens', tag: 'Addis Pride' },
          { name: 'Leb-Leb Warm Kitfo (ለብ ለብ ክትፎ)', price: 460, desc: 'Lightly warm seared kitfo with spiced cardamoms, served with fresh hot kocho flatbread', tag: 'Chef Choice' },
          { name: 'Dullet (ዱለት)', price: 390, desc: 'Pan-fried minced tripe, liver, and lean beef sauteed with jalapeños, onions, and spiced butter', tag: 'Traditional' },
        ],
      },
      {
        name: 'Yetsom Fasting Beyaynetu (የጾም በያይነቱ)',
        icon: '🌱',
        items: [
          { name: 'Royal 8-Item Veggie Combination', price: 320, desc: 'Misir wot, kik alicha, gomen, atkilt wot, shiro, timatim fitfit, fosolia, and beetroot', tag: '100% Vegan' },
          { name: 'Shiro Tegabino be Denb (ሽሮ ተጋቢኖ)', price: 260, desc: 'Boiling clay pot chickpea and split-pea stew seasoned with garlic, ginger, and berbere', tag: 'Clay Pot 🔥' },
          { name: 'Mushroom Tibs (የእንጉዳይ ጥብስ)', price: 310, desc: 'Sautéed forest mushrooms with sweet red onions, garlic, and fresh green chili peppers', tag: 'Fasting Favorite' },
        ],
      },
      {
        name: 'Traditional Tej & Buna Ceremony (ጠጅና ቡና)',
        icon: '☕',
        items: [
          { name: 'Authentic Bole Honey Tej (ማር ጠጅ)', price: 220, desc: 'Traditional fermented Ethiopian highland honey wine served in custom glass berele', tag: 'House Brew' },
          { name: 'Jebena Buna & Popcorn Ceremony (ጀበና ቡና)', price: 120, desc: 'Freshly roasted green coffee beans brewed in clay jebena, frankincense aroma, and salted popcorn', tag: 'Ceremony' },
          { name: 'Spiced Black Tea with Cardamom & Cloves', price: 80, desc: 'Highland aromatic black tea simmered with fresh ginger, cinnamon stick, and cardamom pods', tag: null },
        ],
      },
    ],
  },

  liquor_bar: {
    tagline: 'CRAFT COCKTAILS • RESERVE SPIRITS • NIGHTLIFE LOUNGE BITES',
    currency: 'Br',
    categories: [
      {
        name: 'Craft Signature Mixology',
        icon: '🍸',
        items: [
          { name: 'Smoked Bourbon Old Fashioned', price: 420, desc: 'Kentucky bourbon, charred orange bitters, Demerara syrup, smoked with cedar wood', tag: 'Smoky & Bold' },
          { name: 'Velvet Espresso Night Martini', price: 390, desc: 'Double espresso, premium vanilla vodka, coffee liqueur, dusted dark chocolate beans', tag: 'House Special' },
          { name: 'Passionfruit Mezcalita', price: 410, desc: 'Artisanal smoky mezcal, fresh passionfruit purée, agave nectar, black volcanic salt rim', tag: 'Exotic' },
          { name: 'Midnight Tokyo Gin Tonic', price: 360, desc: 'Roku Japanese craft gin, yuzu tonic, dehydrated grapefruit wheel, fresh juniper berries', tag: 'Refreshing' },
        ],
      },
      {
        name: 'Single Malts & Premium Reserves',
        icon: '🥃',
        items: [
          { name: 'Macallan 12Y Double Cask (Shot)', price: 550, desc: 'Highland single malt scotch whisky, notes of dried fruit, butterscotch, and warm spice', tag: 'Single Malt' },
          { name: 'Hennessy V.S.O.P Privilège (Shot)', price: 590, desc: 'Rich French cognac blend, vanilla and toasted oak finish, served neat or on rock', tag: 'Cognac' },
          { name: 'Don Julio Reposado Tequila (Shot)', price: 480, desc: 'Aged 8 months in white oak, smooth hints of dark chocolate, cinnamon, and agave', tag: '100% Agave' },
          { name: 'Johnnie Walker Black Label (Shot)', price: 340, desc: 'Iconic blended scotch, rich dark fruits, sweet vanilla, and signature peat smoke', tag: 'Classic' },
        ],
      },
      {
        name: 'Craft Beers, Ciders & Wines',
        icon: '🍺',
        items: [
          { name: 'Cold Draft St. George Beer (Pint)', price: 110, desc: 'Ethiopian classic crisp golden lager poured ice-cold from tap with dense white head', tag: 'On Tap' },
          { name: 'Artisan Hazy Double IPA (Bottle)', price: 240, desc: 'Unfiltered tropical hop bomb bursting with pineapple, mango, and juicy citrus notes', tag: 'Craft Brew' },
          { name: 'South African Cabernet Sauvignon (Glass)', price: 290, desc: 'Full-bodied red, blackberry fruit forward with smooth velvety French oak tannins', tag: 'Red Wine' },
        ],
      },
      {
        name: 'Late-Night VIP Lounge Bites',
        icon: '🍢',
        items: [
          { name: 'Black Truffle & Parmesan Fries', price: 220, desc: 'Double fried golden russets, black truffle oil, freshly grated pecorino, herb aioli', tag: 'Crunchy' },
          { name: 'Glazed Beef Sliders (3pcs)', price: 380, desc: 'Brioche buns, cheddar cheese, caramelized bacon jam, house secret barbecue glaze', tag: 'Shareable' },
          { name: 'Charcuterie & Artisan Cheese Platter', price: 480, desc: 'Imported cured salami, prosciutto, aged cheeses, kalamata olives, crostini', tag: 'Platter' },
        ],
      },
    ],
  },
};

/**
 * Contextual visual icon for category headers based on category name
 */
export function getCategoryVisualIcon(catName = '') {
  const lower = (catName || '').toLowerCase();
  if (lower.includes('coffee') || lower.includes('tea') || lower.includes('hot drink') || lower.includes('espresso') || lower.includes('latte')) return '☕';
  if (lower.includes('cocktail') || lower.includes('wine') || lower.includes('bar') || lower.includes('beer') || lower.includes('spirit') || lower.includes('whiskey')) return '🍸';
  if (lower.includes('breakfast') || lower.includes('brunch') || lower.includes('egg') || lower.includes('morning')) return '🍳';
  if (lower.includes('sandwich') || lower.includes('burger') || lower.includes('panini') || lower.includes('wrap') || lower.includes('toast')) return '🥪';
  if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('snack') || lower.includes('salad') || lower.includes('side') || lower.includes('wing') || lower.includes('bite')) return '🥗';
  if (lower.includes('local') || lower.includes('traditional') || lower.includes('cultural') || lower.includes('tibs') || lower.includes('kitfo') || lower.includes('wot') || lower.includes('habesha')) return '🍲';
  if (lower.includes('pizza') || lower.includes('pie')) return '🍕';
  if (lower.includes('bakery') || lower.includes('pastry') || lower.includes('croissant') || lower.includes('cake') || lower.includes('dessert') || lower.includes('sweet')) return '🥐';
  if (lower.includes('meat') || lower.includes('steak') || lower.includes('grill') || lower.includes('siga') || lower.includes('beef') || lower.includes('chicken')) return '🥩';
  if (lower.includes('pasta') || lower.includes('noodle')) return '🍝';
  if (lower.includes('juice') || lower.includes('smoothie') || lower.includes('chiller') || lower.includes('shake') || lower.includes('drink')) return '🧃';
  if (lower.includes('seafood') || lower.includes('fish')) return '🐟';
  return '🍽️';
}

/**
 * Strict product-to-category matching helper.
 * Handles both populated { _id, name } objects and raw ObjectId / ID strings.
 * Prevents undefined === undefined matching bugs.
 */
export function productMatchesCategory(product, category) {
  if (!product || !category) return false;

  const targetCatId = category._id ? String(category._id) : (category.id ? String(category.id) : null);
  const targetCatName = category.name ? String(category.name).trim().toLowerCase() : null;

  // 1. Check product.categoryId as populated object
  if (product.categoryId && typeof product.categoryId === 'object') {
    const popId = product.categoryId._id ? String(product.categoryId._id) : (product.categoryId.id ? String(product.categoryId.id) : null);
    if (targetCatId && popId && popId === targetCatId) return true;
    if (targetCatName && product.categoryId.name && String(product.categoryId.name).trim().toLowerCase() === targetCatName) return true;
  }

  // 2. Check product.categoryId as direct ID string
  if (product.categoryId && typeof product.categoryId !== 'object') {
    const strId = String(product.categoryId).trim();
    if (targetCatId && strId && strId === targetCatId) return true;
  }

  // 3. Check product.category as populated object
  if (product.category && typeof product.category === 'object') {
    const popId = product.category._id ? String(product.category._id) : (product.category.id ? String(product.category.id) : null);
    if (targetCatId && popId && popId === targetCatId) return true;
    if (targetCatName && product.category.name && String(product.category.name).trim().toLowerCase() === targetCatName) return true;
  }

  // 4. Check product.category as direct ID string
  if (product.category && typeof product.category !== 'object') {
    const strId = String(product.category).trim();
    if (targetCatId && strId && strId === targetCatId) return true;
  }

  // 5. Fallback: Check categoryName string on product
  if (targetCatName && product.categoryName && String(product.categoryName).trim().toLowerCase() === targetCatName) {
    return true;
  }

  return false;
}

/**
 * Extracts and organizes menu items for the print card.
 * Priority:
 * 1. Live categories & products passed in options
 * 2. Archetype curated sample menu as rich fallback
 */
export function getMenuForCard({ restaurant, categories = [], products = [], templateId = null }) {
  // Determine restaurant archetype preference (fixed per restaurant, NOT per preview template)
  const restaurantArchetype = restaurant?.qrCardTemplate || 'cafe_artisan';
  const fallback = ARCHETYPE_SAMPLE_MENUS[restaurantArchetype] || ARCHETYPE_SAMPLE_MENUS.cafe_artisan;
  const currency = restaurant?.currency || fallback.currency || 'Br';

  // 1. If we have live categories with active products
  if (Array.isArray(categories) && categories.length > 0 && Array.isArray(products) && products.length > 0) {
    const liveCats = [];
    const sortedCats = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    for (const cat of sortedCats) {
      const catProducts = products.filter(
        (p) => productMatchesCategory(p, cat) && p.isAvailable !== false
      );

      if (catProducts.length > 0) {
        liveCats.push({
          name: cat.name,
          icon: cat.icon || getCategoryVisualIcon(cat.name),
          items: catProducts.slice(0, 15).map((p) => ({
            name: p.name,
            price: p.price,
            tag: p.tag || (p.isVegetarian ? '🌱 Vegan' : (p.isSpicy ? '🔥 Spicy' : (p.modifierGroups?.length ? `${p.modifierGroups.length} opts` : null))),
          })),
        });
      }
    }

    // Include any active products that did not match an active category
    const includedProductNames = new Set();
    liveCats.forEach((c) => c.items.forEach((it) => includedProductNames.add(it.name)));
    const unassigned = products.filter((p) => p.isAvailable !== false && !includedProductNames.has(p.name));
    if (unassigned.length > 0 && liveCats.length < 8) {
      liveCats.push({
        name: 'Chef Specialties',
        icon: '✨',
        items: unassigned.map((p) => ({
          name: p.name,
          price: p.price,
          tag: p.tag || (p.isVegetarian ? '🌱 Vegan' : (p.isSpicy ? '🔥 Spicy' : null)),
        })),
      });
    }

    if (liveCats.length > 0) {
      return {
        tagline: restaurant?.tagline || fallback.tagline,
        currency,
        categories: liveCats.slice(0, 8), // Balances dynamically across 2 columns
      };
    }
  }

  // 2. If products exist without explicit categories, bundle into a single catalog
  if (Array.isArray(products) && products.length > 0) {
    const activeProducts = products.filter((p) => p.isAvailable !== false);
    if (activeProducts.length > 0) {
      return {
        tagline: restaurant?.tagline || fallback.tagline,
        currency,
        categories: [
          {
            name: 'House Menu',
            icon: '🍽️',
            items: activeProducts.slice(0, 16).map((p) => ({
              name: p.name,
              price: p.price,
              tag: p.tag || (p.isVegetarian ? '🌱 Vegan' : (p.isSpicy ? '🔥 Spicy' : null)),
            })),
          },
        ],
      };
    }
  }

  // 3. Fallback: Cleaned restaurant sample menu (no descriptions, consistent across all templates)
  const cleanedFallbackCategories = fallback.categories.map((c) => ({
    name: c.name,
    icon: c.icon || '🍽️',
    items: (c.items || []).map((it) => ({
      name: it.name,
      price: it.price,
      tag: it.tag || null,
    })),
  }));

  return {
    tagline: restaurant?.tagline || fallback.tagline,
    currency,
    categories: cleanedFallbackCategories,
  };
}

/**
 * Cleanly format price for print cards
 */
export function formatPrintPrice(amount, currency = 'Br') {
  if (typeof amount !== 'number' && !amount) return '';
  const num = Number(amount);
  const formatted = num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
  return `${formatted} ${currency}`;
}
