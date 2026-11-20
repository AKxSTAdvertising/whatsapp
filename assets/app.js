'use strict';
/* UnboxedThinking CRM — browser-local MVP. Never auto-sends messages or uploads lead data. */
(()=> {
 const KEY='unboxedthinking.crm.v1';
 const STATUS=['New','Contacted','Connected','Replied','Interested','Follow-up','Meeting booked','Won','Not interested'];
 const HEADERS=['Business Name','Niche','Founder','Phone','Email','Address','Website','Rating','Reviews','Website Status','Digital Score','Lead Priority'];
 let leads=[],page=1,activeId=null,toastTimer=null,pendingWhatsAppId=localStorage.getItem('unboxedthinking.pendingWhatsAppLead')||'',cloudReady=false,syncQueue=Promise.resolve(),synced=new Map(),syncPending=0,selected=new Set(),bulkBusy=false,activeView='new',messageTemplates={general:'Hi {{business_name}}, I came across your business and wanted to connect. We help businesses improve their online presence and generate more enquiries. Would you be open to a quick conversation?',followup:'Hi {{business_name}}, just following up on my earlier message. I wanted to check if you had a chance to review it. Happy to share more details if useful.'},previewType='general';
 const formatGeneralPitch=message=>{
  const greeting="Hello Sir/Ma'am,";
  if(!message.startsWith(greeting))return message;
  const body=message.slice(greeting.length).replace(/\s+/g," ").trim();
  const ctaPattern=/\s+(Would you be|Would you like|Would that|Would this|May I|Open to|Interested in|Worth a|Happy to|If you share|If so|Either answer|I can tailor|I’d be glad|I'd be glad|Which of these)\b/i;
  const ctaMatch=ctaPattern.exec(body);
  const main=ctaMatch?body.slice(0,ctaMatch.index).trim():body;
  const cta=ctaMatch?body.slice(ctaMatch.index).trim():"";
  const sentenceBreak=main.search(/[.!?]\s+(?=[A-Z])/);
  const opening=sentenceBreak>=0?main.slice(0,sentenceBreak+1).trim():"";
  const detail=sentenceBreak>=0?main.slice(sentenceBreak+1).trim():main;
  return [greeting,opening,detail,cta].filter(Boolean).join("\n\n");
};
 const DEFAULT_GENERAL_VARIANTS=["Hello Sir/Ma'am, I came across {{business_name}} and wanted to share a product idea. We can create {{product_idea}} based on your theme, branding and requirements. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and wanted to share a product idea. Our designs can be customised in shape, size and style to suit your business. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and wanted to share a product idea. From display accessories to decorative pieces, we can discuss a design that fits your needs. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and wanted to share a product idea. We can work on one-off pieces, prototypes or quantities for a business order. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and wanted to share a product idea. Instead of choosing only ready-made items, you can explore a design made around your idea. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, may I introduce our custom 3D printing work? Our designs can be customised in shape, size and style to suit your business. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, may I introduce our custom 3D printing work? From display accessories to decorative pieces, we can discuss a design that fits your needs. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, may I introduce our custom 3D printing work? We can work on one-off pieces, prototypes or quantities for a business order. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, may I introduce our custom 3D printing work? Instead of choosing only ready-made items, you can explore a design made around your idea. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, may I introduce our custom 3D printing work? We can create {{product_idea}} based on your theme, branding and requirements. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we create custom 3D-printed products and thought your business may find them useful. From display accessories to decorative pieces, we can discuss a design that fits your needs. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we create custom 3D-printed products and thought your business may find them useful. We can work on one-off pieces, prototypes or quantities for a business order. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we create custom 3D-printed products and thought your business may find them useful. Instead of choosing only ready-made items, you can explore a design made around your idea. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we create custom 3D-printed products and thought your business may find them useful. We can create {{product_idea}} based on your theme, branding and requirements. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we create custom 3D-printed products and thought your business may find them useful. Our designs can be customised in shape, size and style to suit your business. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, I noticed {{business_name}} and had an idea for a customised product range. We can work on one-off pieces, prototypes or quantities for a business order. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, I noticed {{business_name}} and had an idea for a customised product range. Instead of choosing only ready-made items, you can explore a design made around your idea. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, I noticed {{business_name}} and had an idea for a customised product range. We can create {{product_idea}} based on your theme, branding and requirements. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, I noticed {{business_name}} and had an idea for a customised product range. Our designs can be customised in shape, size and style to suit your business. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, I noticed {{business_name}} and had an idea for a customised product range. From display accessories to decorative pieces, we can discuss a design that fits your needs. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we turn creative ideas into physical 3D-printed products for businesses. Instead of choosing only ready-made items, you can explore a design made around your idea. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we turn creative ideas into physical 3D-printed products for businesses. We can create {{product_idea}} based on your theme, branding and requirements. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we turn creative ideas into physical 3D-printed products for businesses. Our designs can be customised in shape, size and style to suit your business. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we turn creative ideas into physical 3D-printed products for businesses. From display accessories to decorative pieces, we can discuss a design that fits your needs. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we turn creative ideas into physical 3D-printed products for businesses. We can work on one-off pieces, prototypes or quantities for a business order. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi, are you open to exploring distinctive products made specifically for your business? We can create {{product_idea}} based on your theme, branding and requirements. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi, are you open to exploring distinctive products made specifically for your business? Our designs can be customised in shape, size and style to suit your business. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi, are you open to exploring distinctive products made specifically for your business? From display accessories to decorative pieces, we can discuss a design that fits your needs. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi, are you open to exploring distinctive products made specifically for your business? We can work on one-off pieces, prototypes or quantities for a business order. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi, are you open to exploring distinctive products made specifically for your business? Instead of choosing only ready-made items, you can explore a design made around your idea. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we would love to introduce PROTO_FLOW_3D and our custom 3D products. Our designs can be customised in shape, size and style to suit your business. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we would love to introduce PROTO_FLOW_3D and our custom 3D products. From display accessories to decorative pieces, we can discuss a design that fits your needs. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we would love to introduce PROTO_FLOW_3D and our custom 3D products. We can work on one-off pieces, prototypes or quantities for a business order. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we would love to introduce PROTO_FLOW_3D and our custom 3D products. Instead of choosing only ready-made items, you can explore a design made around your idea. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we would love to introduce PROTO_FLOW_3D and our custom 3D products. We can create {{product_idea}} based on your theme, branding and requirements. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we make personalised 3D-printed items for business spaces and customers. From display accessories to decorative pieces, we can discuss a design that fits your needs. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we make personalised 3D-printed items for business spaces and customers. We can work on one-off pieces, prototypes or quantities for a business order. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we make personalised 3D-printed items for business spaces and customers. Instead of choosing only ready-made items, you can explore a design made around your idea. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we make personalised 3D-printed items for business spaces and customers. We can create {{product_idea}} based on your theme, branding and requirements. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we make personalised 3D-printed items for business spaces and customers. Our designs can be customised in shape, size and style to suit your business. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we are connecting with businesses that may be interested in customised 3D products. We can work on one-off pieces, prototypes or quantities for a business order. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we are connecting with businesses that may be interested in customised 3D products. Instead of choosing only ready-made items, you can explore a design made around your idea. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we are connecting with businesses that may be interested in customised 3D products. We can create {{product_idea}} based on your theme, branding and requirements. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we are connecting with businesses that may be interested in customised 3D products. Our designs can be customised in shape, size and style to suit your business. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we are connecting with businesses that may be interested in customised 3D products. From display accessories to decorative pieces, we can discuss a design that fits your needs. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, I wanted to show you a different product option for your business. Instead of choosing only ready-made items, you can explore a design made around your idea. Would you like to see some examples?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, I wanted to show you a different product option for your business. We can create {{product_idea}} based on your theme, branding and requirements. May I share a few design options and details?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, I wanted to show you a different product option for your business. Our designs can be customised in shape, size and style to suit your business. Would you be open to discussing a small trial order?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, I wanted to show you a different product option for your business. From display accessories to decorative pieces, we can discuss a design that fits your needs. Is there a particular product you would like us to customise?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, I wanted to show you a different product option for your business. We can work on one-off pieces, prototypes or quantities for a business order. Should I send you a few ideas relevant to your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/"];
 const DEFAULT_GENERAL2_VARIANTS=["Hello Sir/Ma'am, I came across {{business_name}} and thought of a 3D product idea for your {{niche}} business. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and thought of a 3D product idea for your {{niche}} business. These can be designed to match your space, brand identity and day-to-day requirements. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and thought of a 3D product idea for your {{niche}} business. We can discuss a sample first, then work out pricing and quantities if the design suits you. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and thought of a 3D product idea for your {{niche}} business. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, I came across {{business_name}} and thought of a 3D product idea for your {{niche}} business. We can make a design around your brief rather than asking you to choose a standard catalogue item. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we create custom 3D-printed products that could complement businesses like yours. These can be designed to match your space, brand identity and day-to-day requirements. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we create custom 3D-printed products that could complement businesses like yours. We can discuss a sample first, then work out pricing and quantities if the design suits you. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we create custom 3D-printed products that could complement businesses like yours. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we create custom 3D-printed products that could complement businesses like yours. We can make a design around your brief rather than asking you to choose a standard catalogue item. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we create custom 3D-printed products that could complement businesses like yours. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we may be able to make a few useful and branded 3D accessories for {{business_name}}. We can discuss a sample first, then work out pricing and quantities if the design suits you. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we may be able to make a few useful and branded 3D accessories for {{business_name}}. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we may be able to make a few useful and branded 3D accessories for {{business_name}}. We can make a design around your brief rather than asking you to choose a standard catalogue item. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we may be able to make a few useful and branded 3D accessories for {{business_name}}. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, we may be able to make a few useful and branded 3D accessories for {{business_name}}. These can be designed to match your space, brand identity and day-to-day requirements. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, I wanted to introduce a product option that can be customised around your business theme. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, I wanted to introduce a product option that can be customised around your business theme. We can make a design around your brief rather than asking you to choose a standard catalogue item. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, I wanted to introduce a product option that can be customised around your business theme. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, I wanted to introduce a product option that can be customised around your business theme. These can be designed to match your space, brand identity and day-to-day requirements. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, I wanted to introduce a product option that can be customised around your business theme. We can discuss a sample first, then work out pricing and quantities if the design suits you. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we make 3D-printed products and would love to explore a category-specific design with you. We can make a design around your brief rather than asking you to choose a standard catalogue item. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we make 3D-printed products and would love to explore a category-specific design with you. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we make 3D-printed products and would love to explore a category-specific design with you. These can be designed to match your space, brand identity and day-to-day requirements. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we make 3D-printed products and would love to explore a category-specific design with you. We can discuss a sample first, then work out pricing and quantities if the design suits you. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello {{business_name}}, we make 3D-printed products and would love to explore a category-specific design with you. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, are you open to trying customised accessories or decor made through 3D printing? For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, are you open to trying customised accessories or decor made through 3D printing? These can be designed to match your space, brand identity and day-to-day requirements. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, are you open to trying customised accessories or decor made through 3D printing? We can discuss a sample first, then work out pricing and quantities if the design suits you. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, are you open to trying customised accessories or decor made through 3D printing? Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi there, are you open to trying customised accessories or decor made through 3D printing? We can make a design around your brief rather than asking you to choose a standard catalogue item. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we have a few product ideas that may fit your business and customer experience. These can be designed to match your space, brand identity and day-to-day requirements. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we have a few product ideas that may fit your business and customer experience. We can discuss a sample first, then work out pricing and quantities if the design suits you. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we have a few product ideas that may fit your business and customer experience. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we have a few product ideas that may fit your business and customer experience. We can make a design around your brief rather than asking you to choose a standard catalogue item. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello Sir/Ma'am, we have a few product ideas that may fit your business and customer experience. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we can turn your product idea or branding into a physical 3D-printed item. We can discuss a sample first, then work out pricing and quantities if the design suits you. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we can turn your product idea or branding into a physical 3D-printed item. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we can turn your product idea or branding into a physical 3D-printed item. We can make a design around your brief rather than asking you to choose a standard catalogue item. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we can turn your product idea or branding into a physical 3D-printed item. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi {{business_name}} team, we can turn your product idea or branding into a physical 3D-printed item. These can be designed to match your space, brand identity and day-to-day requirements. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, I am reaching out because our custom 3D printing may be relevant to your business category. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, I am reaching out because our custom 3D printing may be relevant to your business category. We can make a design around your brief rather than asking you to choose a standard catalogue item. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, I am reaching out because our custom 3D printing may be relevant to your business category. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, I am reaching out because our custom 3D printing may be relevant to your business category. These can be designed to match your space, brand identity and day-to-day requirements. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hello, I am reaching out because our custom 3D printing may be relevant to your business category. We can discuss a sample first, then work out pricing and quantities if the design suits you. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we would like to explore a small customised product order for {{business_name}}. We can make a design around your brief rather than asking you to choose a standard catalogue item. Would you like to see a few relevant ideas?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we would like to explore a small customised product order for {{business_name}}. For your category, we could explore {{product_idea}} with your logo, colours or preferred dimensions. May I share our website and discuss a suitable design?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we would like to explore a small customised product order for {{business_name}}. These can be designed to match your space, brand identity and day-to-day requirements. Would a sample or small trial quantity be worth exploring?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we would like to explore a small customised product order for {{business_name}}. We can discuss a sample first, then work out pricing and quantities if the design suits you. Can I know which type of product would be useful for your business?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/","Hi Sir/Ma'am, we would like to explore a small customised product order for {{business_name}}. Our 3D printing process lets us create custom shapes that may be difficult to find ready-made. Would you be open to discussing a customised or bulk requirement?\n\nExplore our 3D products: https://proto-flow-3d.gamerparadise1995.workers.dev/"];
 const DEFAULT_GENERAL2_CATEGORY_TAGS='Cafe, Café, Coffee Shop, Restaurant, Bistro, Bakery, Pizzeria, Food Court, Hotel, Resort, Guest House, Banquet Hall, Event Venue, Catering, Home Decor, Home Decoration, Interior Decor, Wall Decor, Gift Shop, Gift Store, Souvenir Shop, Retail Store, Boutique, Salon, Spa, Beauty Studio, Office, Corporate Office, Coworking, Real Estate, Property Dealer, Gym, Fitness Studio, School, College, Coaching, Clinic, Dental Clinic, Hospital, Jewellery Store, Electronics Store, 3D Printing, Prototype, Product Design, Architecture, Interior Designer';
 const $=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val=(o,k)=>String(o?.[k]??'').trim();
 const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const stamp=()=>new Date().toISOString();
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 function notify(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3700)}
 function snapshot(l){return JSON.stringify(l)}
 function markSynced(){synced=new Map(leads.map(l=>[dedupKey(l),snapshot(l)]))}
 function save(){
   if(!cloudReady){notify('Please sign in to save your leads.');return false}
   const changed=leads.filter(l=>synced.get(dedupKey(l))!==snapshot(l)).map(l=>structuredClone(l));
   if(!changed.length)return true;
   syncPending++;const pill=document.querySelector('.local-pill');if(pill)pill.textContent='● Syncing '+changed.length+' leads…';
   syncQueue=syncQueue.catch(()=>{}).then(async()=>{
     await window.UnboxedCloud.put(changed);
     for(const l of changed)synced.set(dedupKey(l),snapshot(l));
     notify('Cloud sync complete ('+changed.length+' updated).');
   }).catch(err=>{notify('Cloud sync FAILED: '+err.message+' — do not close this tab; export a backup.');console.error('Cloud sync error',err)}).finally(()=>{
     syncPending--;if(pill&&syncPending===0)pill.textContent='● Supabase cloud sync';
   });
   return true;
 }
 function cleanNumber(phone){let d=String(phone||'').replace(/[^\d]/g,'');if(d.length===10)d='91'+d;return d.length>=10&&d.length<=15?d:''}
 function truthyPhone(p){return !!String(p||'').trim()&&!/^(n\/?a|na|none|null|nan|undefined|[-–])$/i.test(String(p).trim())}
 function priorityRank(p){const x=String(p||'').toLowerCase();if(x.includes('high')||x==='hot'||x==='1')return 3;if(x.includes('medium')||x==='warm'||x==='2')return 2;return 1}
 function badge(s,kind){const cl=kind==='priority'?(priorityRank(s)===3?'high':priorityRank(s)===2?'medium':'low'):String(s).toLowerCase().replace(/\s+/g,'-');return '<span class="chip '+safe(cl)+'">'+safe(s||'—')+'</span>'}
 function parseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  let delimiter=',',counts={',':0,';':0,'\t':0},quoted=false;
  for(let i=0;i<text.length&&text[i]!=='\n'&&text[i]!=='\r';i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted}else if(!quoted&&Object.prototype.hasOwnProperty.call(counts,ch))counts[ch]++}
  delimiter=Object.keys(counts).sort((x,y)=>counts[y]-counts[x])[0];
  const rows=[];let row=[],field='';quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}
   else if(ch==='"')quoted=true;else if(ch===delimiter){row.push(field);field=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(v=>v.trim()))rows.push(row);row=[]}else field+=ch}
  if(quoted)throw new Error('CSV has an unclosed quotation mark.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows
 }
 const CSV_ALIASES={
  'Business Name':['businessname','business','companyname','companybusinessname','businesscompanyname','company','organization','organisation','firmname','brandname','brand','name'],
  'Phone':['phone','phonenumber','mobile','mobilenumber','contactnumber','contact','whatsappnumber','whatsapp','telephone','tel'],
  'Niche':['niche','industry','category','businesscategory','type','categories'],
  'Founder':['founder','owner','contactperson','personname','decisionmaker'],
  'Email':['email','emailaddress','mail'],
  'Address':['address','location','fulladdress','businessaddress'],
  'Website':['website','websiteurl','url','domain','web'],
  'Rating':['rating','googlerating','reviewrating'],
  'Reviews':['reviews','reviewcount','numberofreviews'],
  'Website Status':['websitestatus','websiteavailability','haswebsite'],
  'Digital Score':['digitalscore','score'],
  'Lead Priority':['leadpriority','priority']
 };
 function csvHeaderIndex(header,key){
  const aliases=CSV_ALIASES[key]||[key.toLowerCase().replace(/[^a-z0-9]/g,'')];
  for(const alias of aliases){const i=header.indexOf(alias);if(i>=0)return i}
  // Accept exported labels such as "Business Name (Required)" or "Company / Business Name".
  if(key==='Business Name'){
   const i=header.findIndex(h=>/^(business|company|organization|organisation|firm|brand)(name)?/.test(h)&&!/(owner|founder|contact|person)/.test(h));
   if(i>=0)return i;
  }
  if(key==='Phone'){
   const i=header.findIndex(h=>/^(phone|mobile|whatsapp|contactnumber|telephone|tel)/.test(h));
   if(i>=0)return i;
  }
  return -1
 }
 function normalize(o){const d={};for(const k of HEADERS)d[k]=val(o,k);d.Niche=String(d.Niche||'').trim()||'Uncategorized';return {...d,id:String(o.id||uid()),status:STATUS.includes(o.status)?o.status:'New',followup:String(o.followup||''),followupTime:String(o.followupTime||''),notes:String(o.notes||''),consent:o.consent===true,updated:String(o.updated||stamp()),firstDraft:String(o.firstDraft||''),followupDraft:String(o.followupDraft||''),sentAt:String(o.sentAt||''),repliedAt:String(o.repliedAt||''),followupSentAt:String(o.followupSentAt||'')}}
 function importCSV(text){const rows=parseCSV(text);if(rows.length<2)throw new Error('CSV does not contain any lead rows.');
  const header=rows.shift().map(h=>String(h||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const phoneIndex=csvHeaderIndex(header,'Phone');if(phoneIndex<0)throw new Error('Phone column not found. Use Phone, Mobile, Mobile Number or Contact Number.');
  const businessIndex=csvHeaderIndex(header,'Business Name');
  if(businessIndex<0)throw new Error('Business name column not found. Use Business Name, Company Name, Business, Company or Name.');
  let added=0,skipped=0,duplicates=0;
  const existing=new Set(leads.map(l=>dedupKey(l)));
  for(const row of rows){const raw={};HEADERS.forEach(k=>{const j=csvHeaderIndex(header,k);raw[k]=j>=0?String(row[j]??'').trim():''});
   if(!truthyPhone(raw.Phone)){skipped++;continue}
   const key=dedupKey(raw);if(existing.has(key)){duplicates++;continue}
   const lead=normalize(raw);leads.push(lead);existing.add(key);added++}
  save();page=1;render();notify('Import queued: '+added+' leads. '+duplicates+' duplicates, '+skipped+' missing phones skipped. Keep this tab open until sync finishes.');return added
 }
 function dedupKey(o){return (val(o,'Phone').replace(/\D/g,'')+'|'+val(o,'Business Name').toLowerCase().replace(/\s+/g,' '))}
 async function handleJSON(text){const parsed=JSON.parse(text);const arr=Array.isArray(parsed)?parsed:parsed.leads;if(!Array.isArray(arr))throw new Error('Not a valid lead backup.');
  if(!confirm('Restore '+arr.length+' leads? This will REPLACE your existing cloud CRM leads. Export a full backup first.'))return;
  const restored=arr.filter(o=>o&&typeof o==='object'&&truthyPhone(o.Phone)).map(normalize);
  await syncQueue;await window.UnboxedCloud.clear();await window.UnboxedCloud.put(restored);
  leads=restored;selected.clear();markSynced();page=1;render();notify('Restored '+restored.length+' leads to Supabase.')}
 function csvCell(x){let s=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function downloadCSVTemplate(){
  const out=[HEADERS.map(k=>csvCell(k==='Niche'?'Category':k)).join(',')];
  download('unboxedthinking-leads-template.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  notify('CSV template downloaded. Fill Business Name, Phone and Category; blank categories will go to Uncategorized.');
 }
 function exportCSV(){if(!leads.length){notify('Import leads first.');return}
  const cols=[...HEADERS,'Status','Follow-up Date','Follow-up Time','Notes','Contact Permission','First Draft','Followup Draft','Sent At','Replied At','Followup Sent At','Updated'];
  const out=[cols.map(csvCell).join(',')];for(const l of leads){out.push([...HEADERS.map(k=>l[k]),l.status,l.followup,l.followupTime,l.notes,l.consent?'Yes':'No',l.firstDraft,l.followupDraft,l.sentAt,l.repliedAt,l.followupSentAt,l.updated].map(csvCell).join(','))}
  download('unboxedthinking-leads-'+day()+'.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));notify('CSV exported.')}
 function backup(){if(!leads.length){notify('No leads to back up.');return}download('unboxedthinking-full-backup-'+day()+'.json',new Blob([JSON.stringify({version:1,exportedAt:stamp(),leads},null,2)],{type:'application/json'}));notify('Full backup downloaded.')}
 function filtered(){const q=$('search').value.trim().toLowerCase(),st=$('statusFilter').value,niche=$('nicheFilter').value,pr=$('priorityFilter').value,web=$('websiteFilter').value,sort=$('sort').value;
  let result=leads.filter(l=>(activeView==='all'||(activeView==='new'?l.status==='New':activeView==='contacted'?l.status==='Connected':activeView==='interested'?l.status==='Interested':activeView==='messageSent'?l.status==='Contacted':activeView==='followups'?l.status==='Follow-up':activeView==='notinterested'?l.status==='Not interested':l.status!=='New'))&&(!q||[l['Business Name'],l.Niche,l.Founder,l.Phone,l.Address,l.Email].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(!niche||String(l.Niche||'').trim().toLocaleLowerCase()===niche.toLocaleLowerCase())&&(!pr||l['Lead Priority']===pr)&&(!web||l['Website Status']===web));
  result.sort((a,b)=>sort==='name'?val(a,'Business Name').localeCompare(val(b,'Business Name')):sort==='recent'?val(b,'updated').localeCompare(val(a,'updated')):sort==='followup'?(a.followup||'9999').localeCompare(b.followup||'9999'):priorityRank(b['Lead Priority'])-priorityRank(a['Lead Priority']));
  return result
 }
 function options(select,values,label){const keep=select.value;const unique=new Map();values.map(v=>String(v||'').trim()).filter(Boolean).forEach(v=>{const key=v.toLocaleLowerCase();if(!unique.has(key))unique.set(key,v)});const items=[...unique.values()].sort((a,b)=>a.localeCompare(b));select.innerHTML='<option value="">All '+safe(label)+'</option>'+items.map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join('');select.value=[...select.options].some(o=>o.value.toLocaleLowerCase()===keep.toLocaleLowerCase())?keep:''}
 function render(){let contacted=leads.filter(x=>x.status==='Connected').length,interested=leads.filter(x=>x.status==='Interested').length,due=leads.filter(x=>x.status==='Follow-up').length;
  $('statTotal').textContent=leads.length.toLocaleString('en-IN');$('statContacted').textContent=contacted.toLocaleString('en-IN');$('statInterested').textContent=interested.toLocaleString('en-IN');$('statDue').textContent=due.toLocaleString('en-IN');$('leadCount').textContent=leads.length.toLocaleString('en-IN');
  $('overviewLeadRows').innerHTML=leads.slice().sort((a,b)=>val(b,'updated').localeCompare(val(a,'updated'))).map(l=>'<tr><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone||'—')+'</td><td>'+badge(l.status||'New','status')+'</td><td>'+safe(l.updated?new Date(l.updated).toLocaleDateString('en-IN'):'—')+'</td><td><button class="mini-btn" data-open="'+safe(l.id)+'">Manage</button></td></tr>').join('');
  $('overviewLeadTotal').textContent=leads.length.toLocaleString('en-IN');
  $('contactedNavCount').textContent=contacted.toLocaleString('en-IN');
  $('interestedNavCount').textContent=interested.toLocaleString('en-IN');
  $('directoryHeading').textContent={new:'New leads',contacted:'Connected leads',interested:'Interested',all:'All leads',notinterested:'Not Interested',messageSent:'Message Sent',followups:'Follow-ups'}[activeView]||'Leads';
  $('directoryHint').textContent={new:'Write your first message; after sending, update the lead status.',contacted:'Only leads marked Connected appear here.',interested:'Leads marked Interested appear here. Manage each lead to update its status.',all:'Your entire pipeline.',notinterested:'Leads marked Not Interested. Select any lead and use Delete selected to remove it permanently.',messageSent:'Leads whose first message has been marked as sent.',followups:'Only leads with an active Follow-up status and a saved date and time appear here.'}[activeView]||'Your lead pipeline.';
  options($('nicheFilter'),['Uncategorized',...leads.map(l=>String(l.Niche||'').trim()||'Uncategorized')],'categories');options($('priorityFilter'),leads.map(l=>l['Lead Priority']),'priorities');options($('websiteFilter'),leads.map(l=>l['Website Status']),'website statuses');
  const list=filtered(),per=15,pages=Math.max(1,Math.ceil(list.length/per));page=Math.min(page,pages);const slice=list.slice((page-1)*per,page*per);
  $('leadRows').innerHTML=slice.map(l=>'<tr><td><input class="lead-select" type="checkbox" data-select="'+safe(l.id)+'" aria-label="Select '+safe(l['Business Name']||'lead')+'" '+(selected.has(l.id)?'checked':'')+'></td><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l['Lead Priority'],'priority')+'</td><td>'+safe(l['Website Status']||'Unknown')+'</td><td>'+badge(l.status,'status')+'</td><td>'+safe(l.followup||'—')+'</td><td><div class="row-actions"><button class="mini-btn mini-wa" data-whatsapp="'+safe(l.id)+'">WhatsApp ↗</button>'+(pendingWhatsAppId===l.id?connectionSelect(l):'')+'<button class="mini-btn" data-open="'+safe(l.id)+'">Manage</button></div></td></tr>').join('');
  updateSelectionControls(list,slice);
  $('emptyState').hidden=list.length!==0;$('emptyMessage').textContent=leads.length?'No matching leads. Change the filters to see more.':'Import your cleaned CSV to start your outreach workspace.';$('importEmpty').hidden=leads.length>0;
  $('pageSummary').textContent=list.length?((page-1)*per+1)+'–'+Math.min(page*per,list.length)+' of '+list.length+' leads':'0 leads';$('pageNumber').textContent=page+' / '+pages;$('prevPage').disabled=page===1;$('nextPage').disabled=page===pages;
  const followupLeads=leads.filter(l=>l.status==='Follow-up');
  followupLeads.sort((a,b)=>(a.followup||'9999').localeCompare(b.followup||'9999')||val(b,'updated').localeCompare(val(a,'updated')));
  $('dueList').innerHTML=followupLeads.length?followupLeads.map(l=>'<div class="due-item"><div><strong>'+safe(l['Business Name']||'Business')+'</strong><small>'+safe(l.status||'Follow-up')+' · '+safe(l.followup||'No date set')+(l.followupTime?' at '+safe(l.followupTime):'')+' · '+safe(l.Niche||'Lead')+'</small></div><button class="mini-btn" data-open="'+safe(l.id)+'">Manage / Move</button></div>').join(''):'<p class="due-none">No follow-up leads yet. Mark a lead as Follow-up or set its next follow-up date.</p>';
 }
 function whatsappFiltered(){
  const q=$('waSearch').value.trim().toLowerCase(),st=$('waStatusFilter').value,permission=$('waPermissionFilter').value;
  return leads.filter(l=>(!q||[l['Business Name'],l.Phone,l.Niche].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(permission===''||(permission==='yes'&&l.consent)||(permission==='no'&&!l.consent)));
 }
 function renderWhatsAppPage(){
  const list=whatsappFiltered();
  $('waRows').innerHTML=list.map(l=>'<tr><td><input type="checkbox" data-wa-select="'+safe(l.id)+'" '+(selected.has(l.id)?'checked':'')+'></td><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l.status,'status')+'</td><td>'+ (l.consent?'<span class="chip interested">Confirmed</span>':'<span class="chip new">Not confirmed</span>') +'</td><td>'+ (isNew(l)?'First message':'Follow-up') +'</td><td><button class="mini-btn mini-wa" data-whatsapp="'+safe(l.id)+'" '+(!l.consent?'title="Confirm permission for this lead first"':'')+'>Open WhatsApp ↗</button>'+(pendingWhatsAppId===l.id?connectionSelect(l):'')+'</td></tr>').join('');
  const count=list.filter(l=>selected.has(l.id)).length;
  $('waSelectedCount').textContent=selected.size+' selected';
  $('waBulkConsent').disabled=!cloudReady||selected.size===0;
  $('waSelectAll').checked=list.length>0&&count===list.length;
  $('waSelectAll').indeterminate=count>0&&count<list.length;
  $('waSelectPage').checked=list.length>0&&count===list.length;
  $('waSelectPage').indeterminate=count>0&&count<list.length;
  $('waEmpty').hidden=list.length!==0;
 }
 function ensureGeneralVariants(){
  const current=messageTemplates.generalVariantsVersion===8&&Array.isArray(messageTemplates.generalVariants)&&messageTemplates.generalVariants.length===50;
  const variants=current?messageTemplates.generalVariants.slice():DEFAULT_GENERAL_VARIANTS.slice();
  messageTemplates.generalVariantsVersion=8;messageTemplates.generalVariants=variants;messageTemplates.general=variants[0];return variants;
 }
 function ensureGeneral2Variants(){
  const current=messageTemplates.general2VariantsVersion===2&&Array.isArray(messageTemplates.general2Variants)&&messageTemplates.general2Variants.length===50;
  const variants=current?messageTemplates.general2Variants.slice():DEFAULT_GENERAL2_VARIANTS.slice();
  messageTemplates.general2VariantsVersion=2;messageTemplates.general2Variants=variants;messageTemplates.general2=variants[0];
  if(!String(messageTemplates.general2CategoryTags||'').trim()||messageTemplates.general2VariantsVersion!==2)messageTemplates.general2CategoryTags=DEFAULT_GENERAL2_CATEGORY_TAGS;
  return variants;
 }
 function isGeneral2Lead(l){
  const category=String(l?.Niche||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const tags=String(messageTemplates.general2CategoryTags||DEFAULT_GENERAL2_CATEGORY_TAGS).split(',').map(x=>x.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()).filter(Boolean);
  return !!category&&tags.some(tag=>category.includes(tag));
 }
 function renderMessageManager(){
  const general=ensureGeneralVariants(),general2=ensureGeneral2Variants();
  $('generalAudienceCount').textContent=leads.filter(l=>isNew(l)&&!isGeneral2Lead(l)).length.toLocaleString('en-IN');
  $('general2AudienceCount').textContent=leads.filter(l=>isNew(l)&&isGeneral2Lead(l)).length.toLocaleString('en-IN');
  $('followupAudienceCount').textContent=leads.filter(l=>!isNew(l)).length.toLocaleString('en-IN');
  const grid=$('generalVariantsGrid'),grid2=$('general2VariantsGrid'),previewSelect=$('generalPreviewVariant'),previewSelect2=$('general2PreviewVariant');
  const previewIndex=previewSelect.value||'0',previewIndex2=previewSelect2.value||'0';
  previewSelect.innerHTML=general.map((v,i)=>'<option value="'+i+'">Message '+(i+1)+'</option>').join('');
  previewSelect2.innerHTML=general2.map((v,i)=>'<option value="'+i+'">Message '+(i+1)+'</option>').join('');
  previewSelect.value=Number(previewIndex)<general.length?previewIndex:'0';
  previewSelect2.value=Number(previewIndex2)<general2.length?previewIndex2:'0';
  const active=document.activeElement;
  if(active?.dataset?.generalVariant===undefined&&active?.dataset?.general2Variant===undefined){
   grid.innerHTML=general.map((v,i)=>'<article class="template-card variant-card"><div class="template-head"><div><span class="template-kicker">GENERAL 1 / '+String(i+1).padStart(2,'0')+'</span><h3>Message '+(i+1)+'</h3><p>General first-touch message</p></div><span class="template-tag">VARIANT '+(i+1)+'</span></div><textarea data-general-variant="'+i+'" maxlength="3000" rows="5" aria-label="General message 1 variation '+(i+1)+'">'+safe(v)+'</textarea><div class="template-foot"><span>{{business_name}} · {{niche}} · {{founder}}</span><span data-variant-length="'+i+'">'+v.length+' / 3000</span></div></article>').join('');
   grid2.innerHTML=general2.map((v,i)=>'<article class="template-card variant-card"><div class="template-head"><div><span class="template-kicker">GENERAL 2 / '+String(i+1).padStart(2,'0')+'</span><h3>Message '+(i+1)+'</h3><p>Category-matched 3D product sales pitch</p></div><span class="template-tag">VARIANT '+(i+1)+'</span></div><textarea data-general2-variant="'+i+'" maxlength="3000" rows="5" aria-label="General message 2 variation '+(i+1)+'">'+safe(v)+'</textarea><div class="template-foot"><span>{{business_name}} · {{niche}} · {{founder}}</span><span data-general2-variant-length="'+i+'">'+v.length+' / 3000</span></div></article>').join('');
  }
  if(active!==$('general2CategoryTags'))$('general2CategoryTags').value=messageTemplates.general2CategoryTags;
  if(active!==$('followupMessageTemplate'))$('followupMessageTemplate').value=messageTemplates.followup;
  $('followupTemplateLength').textContent=$('followupMessageTemplate').value.length+' / 3000';
  renderMessagePreview();
 }
 function renderMessagePreview(){
  const sample={'Business Name':'Sample Business','Niche':'Home Decor','Founder':'Alex'};
  const general=ensureGeneralVariants(),general2=ensureGeneral2Variants();
  const first=general[Number($('generalPreviewVariant')?.value||0)]||general[0];
  const second=general2[Number($('general2PreviewVariant')?.value||0)]||general2[0],followup=$('followupMessageTemplate').value;
  $('messagePreview').textContent=fillTemplate(previewType==='general2'?second:previewType==='followup'?followup:first,sample)||'Write a message above to see the preview.';
  $('previewGeneral').classList.toggle('btn-primary',previewType==='general');
  $('previewGeneral2').classList.toggle('btn-primary',previewType==='general2');
  $('previewFollowup').classList.toggle('btn-primary',previewType==='followup');
 }
 async function saveMessageTemplates(){
  if(!cloudReady){notify('Sign in before saving message templates.');return}
  const general=Array.from(document.querySelectorAll('[data-general-variant]')).map(el=>el.value.trim());
  const general2=Array.from(document.querySelectorAll('[data-general2-variant]')).map(el=>el.value.trim());
  if(general.length!==50||general2.length!==50){notify('All 50 variants in both General Message groups must be available.');return}
  if(general.some(v=>!v)||general2.some(v=>!v)){notify('Please complete all 100 first-touch message variants before saving.');return}
  const tags=$('general2CategoryTags').value.trim();
  if(!tags){notify('Add at least one category tag for General Message 2.');$('general2CategoryTags').focus();return}
  const next={general:general[0],generalVariants:general,generalVariantsVersion:8,general2:general2[0],general2Variants:general2,general2VariantsVersion:2,general2CategoryTags:tags,followup:$('followupMessageTemplate').value.trim()};
  if(!next.followup){notify('Please keep a shared follow-up message.');return}
  const btn=$('saveMessageTemplates');btn.disabled=true;btn.textContent='Saving…';
  try{await window.UnboxedCloud.saveSettings(next);messageTemplates=next;renderMessageManager();notify('General Message 1, General Message 2 and Follow-up templates saved to your private cloud account.')}
  catch(e){notify('Could not save message templates: '+e.message)}
  finally{btn.disabled=false;btn.textContent='Save all messages'}
 }
 function confirmBulkPermission(){
  const chosen=leads.filter(l=>selected.has(l.id));
  if(!chosen.length){notify('Select contacts first.');return}
  if(!confirm('Confirm WhatsApp permission for '+chosen.length+' selected contact(s)? Continue only if EACH selected contact has agreed to receive messages.'))return;
  chosen.forEach(l=>{l.consent=true;l.updated=stamp()});
  save();render();renderWhatsAppPage();notify('Permission recorded for '+chosen.length+' selected contacts.');
 }
 function updateSelectionControls(list,visible){
   const matching=new Set(list.map(x=>x.id));
   const selectedMatching=list.filter(x=>selected.has(x.id)).length;
   $('selectedCount').textContent=selected.size+' selected'+(selectedMatching!==selected.size?' ('+selectedMatching+' match filters)':'');
   $('bulkDeleteBtn').disabled=!cloudReady||bulkBusy||selected.size===0;
   const pageCount=visible.filter(x=>selected.has(x.id)).length;
   $('selectPage').checked=visible.length>0&&pageCount===visible.length;
   $('selectPage').indeterminate=pageCount>0&&pageCount<visible.length;
   $('selectPage').disabled=visible.length===0||bulkBusy;
   $('selectAllMatching').checked=list.length>0&&selectedMatching===list.length;
   $('selectAllMatching').indeterminate=selectedMatching>0&&selectedMatching<list.length;
   $('selectAllMatching').disabled=list.length===0||bulkBusy;
 }
 function openSingle(){
   if(!cloudReady){notify('Sign in before adding leads.');return}
   $('singleForm').reset();$('singleError').textContent='';$('singleBackdrop').hidden=false;document.body.style.overflow='hidden';$('singleName').focus();
 }
 function closeSingle(){
   $('singleBackdrop').hidden=true;document.body.style.overflow='';
 }
 async function saveSingle(evt){
   evt.preventDefault();if(!cloudReady)return;
   const name=$('singleName').value.trim(),phone=$('singlePhone').value.trim();
   if(!name){$('singleError').textContent='Business name is required.';return}
   if(!cleanNumber(phone)){$('singleError').textContent='Enter a valid 10-digit Indian or international phone number.';return}
   const o=normalize({'Business Name':name,Phone:phone,Niche:$('singleNiche').value.trim(),'Lead Priority':$('singlePriority').value,'Website Status':$('singleWebsiteStatus').value,Website:$('singleWebsite').value.trim()});
   o.notes=$('singleNotes').value.trim();
   if(leads.some(l=>dedupKey(l)===dedupKey(o))){$('singleError').textContent='This business and phone number already exist.';return}
   const btn=$('singleSave');btn.disabled=true;btn.textContent='Saving…';$('singleError').textContent='';
   try{
     await syncQueue;
     await window.UnboxedCloud.put([o]);
     leads.push(o);synced.set(dedupKey(o),snapshot(o));page=1;render();
     closeSingle();notify('Lead added and saved to Supabase.');openLead(o.id);
   }catch(e){$('singleError').textContent='Could not save lead: '+e.message}
   finally{btn.disabled=false;btn.textContent='Save lead to Supabase'}
 }
 async function bulkDelete(){
   if(bulkBusy||!cloudReady||selected.size===0)return;
   const targets=leads.filter(l=>selected.has(l.id));
   if(!targets.length){selected.clear();render();return}
   const count=targets.length;
   if(!confirm('Permanently delete '+count+' selected lead'+(count===1?'':'s')+' from your Supabase account? This cannot be undone. Export a backup first.'))return;
   bulkBusy=true;render();
   try{
     await syncQueue;
     const keys=targets.map(dedupKey);
     const deleted=await window.UnboxedCloud.removeKeys(keys);
     // Reload the authoritative cloud state to handle partial deletes or cross-device edits safely.
     const refreshed=await window.UnboxedCloud.load();
     leads=refreshed.map(normalize);markSynced();
     selected.clear();page=1;render();
     notify('Deleted '+deleted+' lead'+(deleted===1?'':'s')+' from Supabase.');
   }catch(e){
     try{leads=(await window.UnboxedCloud.load()).map(normalize);markSynced();selected.clear()}catch(_){}
     notify('Bulk delete incomplete: '+e.message+'. Refresh before retrying.');
   }finally{bulkBusy=false;render()}
 }
 function guessPitch(l){const name=l['Business Name']||'your business',niche=(l.Niche||'business').toLowerCase(),noWebsite=/no|missing|not|none/i.test(l['Website Status']||'');
  return 'Hi, I came across '+name+' and liked what you are doing in '+niche+'. I am reaching out from UnboxedThinking. '+(noWebsite?'We help growing businesses build clean, mobile-friendly websites that turn visitors into enquiries.':'We help businesses improve their website experience and digital presence to generate more enquiries.')+' Would you be open to a quick conversation? If not, no worries — I will not follow up.'}
 function websiteLink(raw){try{let x=String(raw||'').trim();if(!x)return '';if(!/^https?:\/\//i.test(x))x='https://'+x;const u=new URL(x);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(e){return ''}}

 function followupSuggestion(l){return 'Hi, I wanted to follow up on my earlier message about '+(l['Business Name']||'your business')+'. Would you be open to a short conversation? No worries if not.'}
 function isNew(l){return l.status==='New'}
 function connectionSelect(l){return '<select class="connect-select" data-connect-status="'+safe(l.id)+'" aria-label="Mark '+safe(l['Business Name']||'lead')+' as connected"><option value="">Mark as Connected</option><option value="Connected">Connected</option></select>';}
 function productIdeaForLead(l){
  const n=String(l?.Niche||'').toLowerCase();
  if(/cafe|coffee|restaurant|bistro|bakery|pizzeria|food/.test(n))return 'branded QR stands, menu holders, table numbers and counter decor';
  if(/hotel|resort|guest house|banquet|event|catering/.test(n))return 'room signs, reception displays, table decor and branded keepsakes';
  if(/home decor|interior|wall decor|furniture|planter|gift|souvenir/.test(n))return 'custom decor pieces, planters, sculptures and personalised gifts';
  if(/salon|spa|beauty/.test(n))return 'logo displays, product organisers and personalised counter accessories';
  if(/office|corporate|cowork|real estate|property/.test(n))return 'custom nameplates, logo displays, desk accessories and scale models';
  if(/school|college|coaching|clinic|hospital|dental/.test(n))return 'custom signs, desk displays, educational models and branded accessories';
  if(/gym|fitness/.test(n))return 'branded desk accessories, display pieces and customised storage labels';
  if(/jewel|electronics|retail|boutique|store/.test(n))return 'custom product stands, display holders and branded counter accessories';
  return 'custom decor, branded display pieces, functional accessories and product prototypes';
 }
 function fillTemplate(template,l){
  return String(template||'').replace(/\{\{\s*(business_name|niche|founder|product_idea)\s*\}\}|\[(Business Name|Name)\]/gi,(_,key,bracketKey)=>{
   const field=(key||bracketKey||'').toLowerCase();
   const map={'business_name':l['Business Name']||'there','business name':l['Business Name']||'there','niche':l.Niche||'your industry','founder':l.Founder||'there','name':l.Founder||'there','product_idea':productIdeaForLead(l)};
   return map[field]||'';
  }).trim();
 }
 function currentDraft(l){
  if(!isNew(l))return fillTemplate(messageTemplates.followup,l);
  const group=isGeneral2Lead(l)?'general2':'general';
  if(l.firstMessageDraft&&(l.firstMessageGroup===group||(!l.firstMessageGroup&&group==='general')))return l.firstMessageDraft;
  const variants=group==='general2'?ensureGeneral2Variants():ensureGeneralVariants();
  const cacheKey='unboxedthinking.messageVariantAssignments.'+group;
  let assignments={};try{assignments=JSON.parse(localStorage.getItem(cacheKey)||'{}')||{}}catch(e){}
  const cached=Number(assignments[l.id]);
  const index=Number.isInteger(cached)&&cached>=1&&cached<=50?cached-1:Math.floor(Math.random()*variants.length);
  l.firstMessageGroup=group;l.firstMessageVariant=index+1;l.firstMessageDraft=fillTemplate(variants[index],l);
  assignments[l.id]=index+1;try{localStorage.setItem(cacheKey,JSON.stringify(assignments))}catch(e){}
  l.updated=stamp();save();return l.firstMessageDraft;
 }
 function openLead(id){
  const l=leads.find(x=>x.id===id);if(!l)return;activeId=l.id;
  $('detailTitle').textContent=l['Business Name']||'Business';
  const link=websiteLink(l.Website);
  $('detailContent').innerHTML='<div class="detail-meta">'+
   '<div><span>Phone</span><strong>'+safe(l.Phone)+'</strong></div><div><span>Niche</span><strong>'+safe(l.Niche||'—')+'</strong></div>'+
   '<div><span>Website</span><strong>'+(link?'<a href="'+safe(link)+'" target="_blank" rel="noopener noreferrer">View website ↗</a>':safe(l['Website Status']||'—'))+'</strong></div>'+
   '<div><span>Priority</span><strong>'+safe(l['Lead Priority']||'—')+'</strong></div>'+
   '<div><span>First sent</span><strong>'+safe(l.sentAt?new Date(l.sentAt).toLocaleString():'Not marked')+'</strong></div>'+
   '<div><span>Reply received</span><strong>'+safe(l.repliedAt?new Date(l.repliedAt).toLocaleString():'Not marked')+'</strong></div></div>'+
   '<div class="detail-fields"><div class="field"><label for="detailStatus">Move to section / Lead status</label><select id="detailStatus">'+STATUS.map(st=>'<option '+(l.status===st?'selected':'')+'>'+safe(st)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label for="detailDate">Follow-up date</label><input type="date" id="detailDate" value="'+safe(l.followup)+'" '+(l.status==='Follow-up'?'required':'')+' ></div>'+
    '<div class="field" id="followupTimeField" '+(l.status==='Follow-up'?'':'hidden')+'><label for="detailTime">Follow-up time</label><input type="time" id="detailTime" value="'+safe(l.followupTime)+'" '+(l.status==='Follow-up'?'required':'')+'></div>'+
   '<div class="field wide"><label for="detailNotes">Notes</label><textarea id="detailNotes" maxlength="10000" placeholder="Conversation notes...">'+safe(l.notes)+'</textarea></div>'+
   '<div class="field wide"><label class="consent"><input type="checkbox" id="detailConsent" '+(l.consent?'checked':'')+'><span>I confirm this business has permitted WhatsApp outreach; I will respect opt-outs.</span></label></div></div>'+
   '<div class="message-box"><p>'+(isNew(l)?(isGeneral2Lead(l)?'GENERAL MESSAGE 2 · 3D HOME DECOR':'GENERAL MESSAGE 1'):'FOLLOW-UP MESSAGE')+' · SHARED TEMPLATE</p><div class="shared-message-preview">'+safe(currentDraft(l)||'No message saved yet. Open Message Manager to add one.')+'</div><div class="draft-actions"><span>Category-based message routing</span><button class="btn btn-outline btn-small" id="goMessageManager">Edit shared message →</button></div></div>'+
   '<p class="workflow-hint">'+(isNew(l)?'After you press Send in WhatsApp, click <b>Mark as Sent</b> to move this business to <b>Contacted Leads</b>.':'This lead is in <b>Contacted Leads</b>. The WhatsApp button uses the second message.')+'</p>'+
   '<div class="modal-actions"><button class="btn btn-primary" id="saveLead">Save changes</button><button class="btn btn-outline" id="copyPitch">Copy active message</button><button class="btn btn-whatsapp" id="waLead">WhatsApp App ↗</button><button class="btn btn-outline" id="callLead">Call</button></div>'+
   '<div class="whatsapp-fallback"><a id="waWebFallback" href="#" target="_blank" rel="noopener noreferrer" hidden>App unavailable? Open WhatsApp Web directly ↗</a></div>'+
   '<div class="modal-actions workflow-actions"><button class="btn btn-outline" id="markSent">✓ Message Sent</button><button class="btn btn-outline" id="moveToNew">↶ Move to New Leads</button><button class="btn btn-outline" id="markFollowup" '+(isNew(l)?'disabled':'')+'>◷ Follow-up Sent</button></div>';
  const statusSelect=$('detailStatus');
  let previousStatus=l.status||'New';
  const syncFollowupFields=()=>{
   const show=statusSelect.value==='Follow-up';
   $('followupTimeField').hidden=!show;
   $('detailDate').required=show;
   $('detailTime').required=show;
  };
  statusSelect.addEventListener('change',()=>{
   const next=statusSelect.value;
   if(next==='Follow-up'&&previousStatus!=='Follow-up'){openFollowupSchedule(previousStatus);return}
   previousStatus=next;syncFollowupFields();
  });
  syncFollowupFields();
  $('detailBackdrop').hidden=false;document.body.style.overflow='hidden';$('closeDetail').focus()
 }
 function closeLead(){activeId=null;$('detailBackdrop').hidden=true;document.body.style.overflow=''}
 function openFollowupSchedule(previousStatus){
  const backdrop=$('followupScheduleBackdrop');
  $('scheduleFollowupDate').value=$('detailDate')?.value||day();
  $('scheduleFollowupTime').value=$('detailTime')?.value||'';
  backdrop.dataset.previousStatus=previousStatus||'New';
  backdrop.hidden=false;
  $('scheduleFollowupDate').focus();
 }
 function closeFollowupSchedule(saveSchedule){
  const backdrop=$('followupScheduleBackdrop');
  const date=$('scheduleFollowupDate').value,time=$('scheduleFollowupTime').value;
  if(saveSchedule&&(!date||!time)){
   notify('Follow-up ke liye date aur time dono select karna mandatory hai.');
   (!date?$('scheduleFollowupDate'):$('scheduleFollowupTime')).focus();
   return;
  }
  if(saveSchedule){
   $('detailDate').value=date;$('detailTime').value=time;
   $('detailStatus').value='Follow-up';$('followupTimeField').hidden=false;
   $('detailDate').required=true;$('detailTime').required=true;
   backdrop.hidden=true;
   const saved=persistModal();
   if(saved){closeLead();notify('Follow-up saved. Lead Follow-ups module mein move ho gayi hai.')}
   return;
  }
  const previous=backdrop.dataset.previousStatus||'New';
  $('detailStatus').value=previous;
  $('followupTimeField').hidden=previous!=='Follow-up';
  $('detailDate').required=previous==='Follow-up';$('detailTime').required=previous==='Follow-up';
  backdrop.hidden=true;
 }
 function persistModal(){
  const l=leads.find(x=>x.id===activeId);if(!l)return null;
  const nextStatus=$('detailStatus').value,nextDate=$('detailDate').value,nextTime=$('detailTime').value;
   if(nextStatus==='Follow-up'&&(!nextDate||!nextTime)){notify('Follow-up ke liye date aur time dono bharna mandatory hai.');$('followupTimeField').hidden=false;$('detailDate').required=true;$('detailTime').required=true;(!nextDate?$('detailDate'):$('detailTime')).focus();return null}
   l.status=nextStatus;l.followup=nextDate;l.followupTime=nextTime;l.notes=$('detailNotes').value;
  l.consent=$('detailConsent').checked;
  l.updated=stamp();save();render();return l
 }
 function activeMessage(l){return currentDraft(l)}
 function directWhatsApp(l,message){
  const phone=cleanNumber(l.Phone);if(!phone){notify('Please enter a valid phone number.');return}
  if(!l.consent){notify("Confirm this contact's permission in WhatsApp Outreach first.");return}
  // Choose a fresh random first-touch message from the category-matched group.
  if(isNew(l)){
   const group=isGeneral2Lead(l)?'general2':'general';
   const variants=group==='general2'?ensureGeneral2Variants():ensureGeneralVariants();
   const previous=l.firstMessageGroup===group?Number(l.firstMessageVariant)-1:-1;
   let index=Math.floor(Math.random()*variants.length);
   if(variants.length>1&&index===previous)index=(index+1+Math.floor(Math.random()*(variants.length-1)))%variants.length;
   l.firstMessageGroup=group;l.firstMessageVariant=index+1;l.firstMessageDraft=fillTemplate(variants[index],l);
   l.updated=stamp();message=l.firstMessageDraft;save();
  }
  const suffix=message?'&text='+encodeURIComponent(message):'';
  const nativeUrl='whatsapp://send?phone='+phone+suffix;
  const webUrl='https://web.whatsapp.com/send?phone='+phone+suffix;
  const fallback=$('waWebFallback');if(fallback){fallback.href=webUrl;fallback.hidden=false}
  pendingWhatsAppId=l.id;
  try{
   sessionStorage.setItem('unboxedthinking.whatsappSourceView',activeView);
   localStorage.setItem('unboxedthinking.pendingWhatsAppLead',l.id);
   // Set before opening WhatsApp; Android may not fire visibilitychange reliably.
   sessionStorage.setItem('unboxedthinking.whatsappAway','1');
  }catch(e){}
  render();if($('waRows'))renderWhatsAppPage();
  window.location.href=nativeUrl;
  notify('Opening WhatsApp app. If unavailable, use the direct Web link in Manage.')
 }
 function clearWhatsAppReturn(){pendingWhatsAppId='';try{localStorage.removeItem('unboxedthinking.pendingWhatsAppLead');sessionStorage.removeItem('unboxedthinking.whatsappAway');sessionStorage.removeItem('unboxedthinking.whatsappSourceView')}catch(e){}}
 function showWhatsAppReturn(){
  if(!pendingWhatsAppId||!cloudReady||$('whatsappReturnBackdrop').dataset.shown==='1')return;
  let away=false;try{away=sessionStorage.getItem('unboxedthinking.whatsappAway')==='1'}catch(e){}
  if(!away)return;
  const l=leads.find(x=>x.id===pendingWhatsAppId);
  if(!l){clearWhatsAppReturn();return}
  let sourceView='';try{sourceView=sessionStorage.getItem('unboxedthinking.whatsappSourceView')||''}catch(e){}
  const interestedChoice=$('whatsappReturnChoices').querySelector('[data-return-status="Interested"]');
  if(interestedChoice)interestedChoice.hidden=sourceView!=='contacted';
  const messageSentChoice=$('whatsappReturnChoices').querySelector('[data-return-status="Contacted"]');
  if(messageSentChoice)messageSentChoice.hidden=false;
  $('whatsappReturnName').textContent=l['Business Name']||'Unnamed business';
  $('whatsappReturnPhone').textContent=l.Phone||'';
  $('whatsappReturnBackdrop').dataset.shown='1';$('whatsappReturnBackdrop').hidden=false;
 }
 function finishWhatsAppReturn(status){
  const l=leads.find(x=>x.id===pendingWhatsAppId);
  if(l&&status==='Follow-up'){clearWhatsAppReturn();$('whatsappReturnBackdrop').hidden=true;$('whatsappReturnBackdrop').dataset.shown='';openLead(l.id);$('detailStatus').value='Follow-up';openFollowupSchedule(l.status||'New');notify('Follow-up ki date aur time select karein, phir Save changes dabayein.');return}
  if(l&&status){
   l.status=status;l.updated=stamp();
   if(status==='Contacted'||status==='Connected')l.sentAt=l.sentAt||stamp();
   if(status==='Replied')l.repliedAt=stamp();
   if(status==='Follow-up')l.followupSentAt=stamp();
   save();
  }
  const wasConnected=status==='Connected';
  clearWhatsAppReturn();$('whatsappReturnBackdrop').hidden=true;$('whatsappReturnBackdrop').dataset.shown='';
  render();if($('waRows'))renderWhatsAppPage();
  if(wasConnected){activeView='contacted';updateNavigation();location.hash='leads'}
  if(status==='Interested'){activeView='interested';updateNavigation();location.hash='leads'}
  // Keep the current module open; the lead moves out of New Leads by status filtering.
  if(status)notify('Lead status updated: '+status+'.');
 }
 function openWhatsApp(){const l=persistModal();if(l)directWhatsApp(l,activeMessage(l))}
 function quickWhatsApp(id){const l=leads.find(x=>x.id===id);if(l)directWhatsApp(l,currentDraft(l)||'')}
 function callLead(){const l=persistModal();if(!l)return;const d=String(l.Phone).replace(/[^\d+]/g,'');if(!d){notify('Phone number missing.');return}window.location.href='tel:'+encodeURIComponent(d)}
 function markConnected(id){
  const l=leads.find(x=>x.id===id);if(!l)return;
  l.status='Connected';l.sentAt=l.sentAt||stamp();l.updated=stamp();
  pendingWhatsAppId='';try{localStorage.removeItem('unboxedthinking.pendingWhatsAppLead')}catch(e){}
  save();activeView='contacted';updateNavigation();location.hash='leads';
  notify('Lead marked as Connected and moved to Connected Leads.');
 }
 function markAction(kind){
  if(kind==='new'){
   const l=leads.find(x=>x.id===activeId);if(!l)return;
   l.status='New';l.followup='';l.followupTime='';l.updated=stamp();
   save();closeLead();activeView='new';updateNavigation();location.hash='leads';
   notify('Lead moved back to New Leads.');return;
  }
  const l=persistModal();if(!l)return;
  if(kind==='sent'){l.status='Contacted';l.sentAt=l.sentAt||stamp()}
  if(kind==='followup'){if(!l.followup||!l.followupTime){notify('Set follow-up date and time before marking it.');openFollowupSchedule(l.status||'New');return}l.status='Follow-up';l.followupSentAt=stamp()}
  l.updated=stamp();save();render();closeLead();
  // Keep the current module open; Message Sent is updated by status filtering.
  notify(kind==='sent'?'Moved to Message Sent module.':'Follow-up recorded manually.')
 }
 function updateNavigation(){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.nav===activeView));
  const shell=document.querySelector('.app-shell');
  if(shell)shell.dataset.page=['new','contacted','interested','all','notinterested','messageSent'].includes(activeView)?'leads':activeView;
  selected.clear();page=1;render();
  if(activeView==='whatsapp')renderWhatsAppPage();
  if(activeView==='messages')renderMessageManager();
 }
 function openImportChooser(){ $('importBackdrop').hidden=false; }
 function closeImportChooser(){ $('importBackdrop').hidden=true; }
 async function readImportFile(e,isJSON){const f=e.target.files?.[0];e.target.value='';if(!f)return;closeImportChooser();if(f.size>10*1024*1024){notify('File is too large (limit: 10 MB).');return}try{const t=await f.text();if(isJSON)await handleJSON(t);else importCSV(t)}catch(err){notify('Import failed: '+err.message)}}

 async function refreshModule(button){
  if(!cloudReady){notify('Sign in before refreshing this module.');return}
  const module=button.dataset.moduleRefresh,original=button.innerHTML;
  button.disabled=true;button.classList.add('is-refreshing');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg><span>Refreshing…</span>';
  try{
   await syncQueue;
   const fresh=await window.UnboxedCloud.load();
   leads=fresh.map(normalize);
   selected=new Set([...selected].filter(id=>leads.some(l=>l.id===id)));
   if(module==='messages'){
    const saved=await window.UnboxedCloud.loadSettings();
    if(saved&&typeof saved==='object')messageTemplates={...messageTemplates,...saved};
    ensureGeneralVariants();
   }
   markSynced();page=1;render();
   if(module==='whatsapp')renderWhatsAppPage();
   if(module==='messages')renderMessageManager();
   notify(module==='messages'?'Message Manager refreshed from cloud.':module==='followups'?'Follow-ups refreshed from cloud.':module==='settings'?'Data module refreshed from cloud.':module==='overview'?'Overview refreshed from cloud.':module==='whatsapp'?'WhatsApp module refreshed from cloud.':'Lead module refreshed from cloud.');
  }catch(error){notify('Refresh failed: '+error.message);console.error('Module refresh failed',module,error)}
  finally{button.disabled=false;button.classList.remove('is-refreshing');button.innerHTML=original}
 }

 function bind(){for(const id of ['importTop','importEmpty','importSettings'])$(id).addEventListener('click',openImportChooser);
  $('uploadCsvBtn').addEventListener('click',()=>$('fileInput').click());
  $('restoreJsonBtn').addEventListener('click',()=>$('jsonInput').click());
  $('downloadImportTemplateBtn').addEventListener('click',downloadCSVTemplate);
  $('closeImportChooser').addEventListener('click',closeImportChooser);
  $('importBackdrop').addEventListener('click',e=>{if(e.target===$('importBackdrop'))closeImportChooser()});
  $('fileInput').addEventListener('change',e=>readImportFile(e,false));
  $('whatsappReturnChoices').addEventListener('click',e=>{const b=e.target.closest('[data-return-status]');if(b)finishWhatsAppReturn(b.dataset.returnStatus)});
  $('whatsappReturnSkip').addEventListener('click',()=>finishWhatsAppReturn(''));
  $('scheduleFollowupSave').addEventListener('click',()=>closeFollowupSchedule(true));
  $('scheduleFollowupCancel').addEventListener('click',()=>closeFollowupSchedule(false));
  $('followupScheduleBackdrop').addEventListener('click',e=>{if(e.target===$('followupScheduleBackdrop'))closeFollowupSchedule(false)});
  $('whatsappReturnBackdrop').addEventListener('click',e=>{if(e.target===$('whatsappReturnBackdrop'))finishWhatsAppReturn('')});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(pendingWhatsAppId)try{sessionStorage.setItem('unboxedthinking.whatsappAway','1')}catch(e){}}else showWhatsAppReturn()});
  window.addEventListener('focus',showWhatsAppReturn);
  window.addEventListener('pageshow',showWhatsAppReturn);
  $('jsonInput').addEventListener('change',e=>readImportFile(e,true));
  $('addSingleTop').addEventListener('click',openSingle);
  $('closeSingle').addEventListener('click',closeSingle);
  $('singleCancel').addEventListener('click',closeSingle);
  $('singleBackdrop').addEventListener('click',e=>{if(e.target===$('singleBackdrop'))closeSingle()});
  $('singleForm').addEventListener('submit',saveSingle);
  $('bulkDeleteBtn').addEventListener('click',bulkDelete);
  $('waBulkConsent').addEventListener('click',confirmBulkPermission);
  $('waSelectAll').addEventListener('change',e=>{for(const l of whatsappFiltered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}renderWhatsAppPage()});
  $('waSelectPage').addEventListener('change',e=>{for(const l of whatsappFiltered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}renderWhatsAppPage()});
  $('waRows').addEventListener('change',e=>{if(!e.target.matches('[data-wa-select]'))return;if(e.target.checked)selected.add(e.target.dataset.waSelect);else selected.delete(e.target.dataset.waSelect);renderWhatsAppPage()});
  $('saveMessageTemplates').addEventListener('click',saveMessageTemplates);
  $('followupMessageTemplate').addEventListener('input',()=>{$('followupTemplateLength').textContent=$('followupMessageTemplate').value.length+' / 3000';renderMessagePreview()});
  $('generalVariantsGrid').addEventListener('input',e=>{const field=e.target.closest('[data-general-variant]');if(!field)return;const counter=$('[data-variant-length="'+field.dataset.generalVariant+'"]');if(counter)counter.textContent=field.value.length+' / 3000';});
  $('general2VariantsGrid').addEventListener('input',e=>{const field=e.target.closest('[data-general2-variant]');if(!field)return;const counter=$('[data-general2-variant-length="'+field.dataset.general2Variant+'"]');if(counter)counter.textContent=field.value.length+' / 3000';});
  $('general2CategoryTags').addEventListener('input',()=>{messageTemplates.general2CategoryTags=$('general2CategoryTags').value;});
  $('generalPreviewVariant').addEventListener('change',renderMessagePreview);
  $('general2PreviewVariant').addEventListener('change',renderMessagePreview);
  $('previewGeneral').addEventListener('click',()=>{previewType='general';renderMessagePreview()});
  $('previewGeneral2').addEventListener('click',()=>{previewType='general2';renderMessagePreview()});
  $('previewFollowup').addEventListener('click',()=>{previewType='followup';renderMessagePreview()});
  for(const id of ['waSearch','waStatusFilter','waPermissionFilter'])$(id).addEventListener(id==='waSearch'?'input':'change',renderWhatsAppPage);
  $('selectPage').addEventListener('change',e=>{const list=filtered().slice((page-1)*15,page*15);for(const l of list){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('selectAllMatching').addEventListener('change',e=>{for(const l of filtered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('leadRows').addEventListener('change',e=>{if(!e.target.matches('[data-select]'))return;if(e.target.checked)selected.add(e.target.dataset.select);else selected.delete(e.target.dataset.select);render()});
  $('exportBtn').addEventListener('click',exportCSV);$('backupBtn').addEventListener('click',backup);$('downloadTemplateBtn').addEventListener('click',downloadCSVTemplate);
  $('restoreInfo').addEventListener('click',()=>notify('Full backup saves status, notes and permissions. Import that JSON to restore them. CSV export is for spreadsheet use.'));
  $('clearBtn').addEventListener('click',async()=>{if(confirm('Permanently delete ALL CRM leads from your Supabase account? Your shared message templates will be preserved. This cannot be undone.')){try{await syncQueue;const removed=await window.UnboxedCloud.clear();leads=[];selected.clear();markSynced();page=1;render();notify('Deleted '+removed+' leads from your cloud CRM.')}catch(e){notify('Could not delete leads: '+e.message)}}});
  for(const id of ['search','statusFilter','nicheFilter','priorityFilter','websiteFilter','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()});
  $('prevPage').addEventListener('click',()=>{page--;render()});$('nextPage').addEventListener('click',()=>{page++;render()});

  document.addEventListener('change',e=>{const connect=e.target.closest('[data-connect-status]');if(connect&&connect.value==='Connected')markConnected(connect.dataset.connectStatus)});
  $('closeDetail').addEventListener('click',closeLead);$('detailBackdrop').addEventListener('click',e=>{if(e.target===$('detailBackdrop'))closeLead()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('singleBackdrop').hidden)closeSingle();else if(!$('detailBackdrop').hidden)closeLead()}});

  $('openFirst').addEventListener('click',()=>{const l=filtered()[0];if(l)openLead(l.id);else notify('Import leads first.')});
  $('mobileMenu').addEventListener('click',()=>$('mobileMenu').closest('.app-shell').querySelector('.sidebar').classList.toggle('is-open'));
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{activeView=a.dataset.nav;updateNavigation();document.querySelector('.sidebar').classList.remove('is-open')}));
  document.querySelectorAll('[data-module-refresh]').forEach(button=>button.addEventListener('click',()=>refreshModule(button)));
 }
  async function enterCloud(){
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Could not load Supabase library.';return}
  $('loginError').textContent='Loading private leads…';
  try{
    const data=await window.UnboxedCloud.load();
    leads=data.map(normalize);
    let savedTemplates=null,settingsLoadError=null;
    try{savedTemplates=await window.UnboxedCloud.loadSettings()}catch(settingsError){settingsLoadError=settingsError;console.warn('Message settings unavailable; opening lead workspace with local defaults.',settingsError)}
    if(savedTemplates&&typeof savedTemplates==='object')messageTemplates={...messageTemplates,...savedTemplates};
    const generalVariants=ensureGeneralVariants(),general2Variants=ensureGeneral2Variants();
    const needsMessageMigration=!settingsLoadError&&(savedTemplates?.generalVariantsVersion!==8||!Array.isArray(savedTemplates?.generalVariants)||savedTemplates.generalVariants.length!==50||savedTemplates?.general2VariantsVersion!==2||!Array.isArray(savedTemplates?.general2Variants)||savedTemplates.general2Variants.length!==50||!String(savedTemplates?.general2CategoryTags||'').trim());
    if(needsMessageMigration){try{await window.UnboxedCloud.saveSettings({general:messageTemplates.general,generalVariants,generalVariantsVersion:7,general2:messageTemplates.general2,general2Variants,general2VariantsVersion:1,general2CategoryTags:messageTemplates.general2CategoryTags,followup:messageTemplates.followup});}catch(migrationError){console.warn('Could not auto-save message group migration; use Save all messages in Message Manager.',migrationError)}}
    $('whatsappReturnBackdrop').dataset.shown='';
    selected.clear();cloudReady=true;markSynced();page=1;render();renderMessageManager();
    document.body.classList.remove('auth-locked');$('authGate').hidden=true;
    showWhatsAppReturn();
    $('loginError').textContent='';
    if(settingsLoadError)notify('CRM leads loaded. Message settings cloud sync issue: '+(settingsLoadError.message||'settings unavailable'));
    const previous=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(Array.isArray(previous)&&previous.length&&confirm('Found '+previous.length+' leads from your earlier browser-only version. Merge these into your private Supabase account?')){
      const existing=new Set(leads.map(dedupKey));let total=0;
      for(const old of previous){if(!old||!truthyPhone(old.Phone))continue;const normalized=normalize(old);const key=dedupKey(normalized);if(!existing.has(key)){leads.push(normalized);existing.add(key);total++}}
      if(total){save();render();notify(total+' old browser leads queued for cloud sync.')}else notify('Existing browser leads already present in cloud.');
      // Keep the original browser copy until you export a backup and verify cloud sync.
    }
  }catch(e){cloudReady=false;document.body.classList.add('auth-locked');$('authGate').hidden=false;$('loginError').textContent='Unable to load private leads: '+e.message;}
 }
 async function bootstrap(){
  // Bind login before optional CRM UI setup, so a separate module error cannot disable sign-in.
  const loginForm=$('loginForm');
  if(loginForm&&!loginForm.dataset.loginBound){
   loginForm.dataset.loginBound='1';
   loginForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=$('loginButton'),error=$('loginError');
    if(button){button.disabled=true;button.textContent='Signing in…'}
    if(error)error.textContent='Connecting to secure login…';
    try{
     if(!window.UnboxedCloud)throw new Error('Login service did not load. Refresh the page and try again.');
     await window.UnboxedCloud.ready();
     await window.UnboxedCloud.signIn($('loginEmail').value.trim(),$('loginPassword').value);
     if(error)error.textContent='Sign-in successful. Loading your workspace…';
     await enterCloud();
     if(!cloudReady)throw new Error(error?.textContent||'Could not open your private workspace.');
    }catch(e){
     if(error)error.textContent=e?.message||'Sign-in failed. Please try again.';
     console.error('CRM sign-in failed:',e);
    }finally{
     if(button){button.disabled=false;button.textContent='Sign in securely →'}
    }
   });
  }
  // Install core CRM click actions before optional UI bindings, so one missing
  // control cannot disable Manage / WhatsApp actions across the whole workspace.
  if(!document.documentElement.dataset.crmCoreClicks){
   document.documentElement.dataset.crmCoreClicks='1';
   document.addEventListener('click',e=>{
    const overviewNav=e.target.closest('[data-overview-nav]');
    if(overviewNav){activeView=overviewNav.dataset.overviewNav;updateNavigation();document.querySelector('.sidebar')?.classList.remove('is-open');return}
    const target=e.target.closest('[data-open]');if(target){openLead(target.dataset.open);return}
    const wa=e.target.closest('[data-whatsapp]');if(wa){quickWhatsApp(wa.dataset.whatsapp);return}
   });
   $('detailContent').addEventListener('click',async e=>{
    const id=e.target.id;
    if(id==='saveLead'){const saved=persistModal();if(saved){notify('Changes queued for Supabase sync.');if(leads.find(x=>x.id===activeId)?.status==='Interested'){closeLead();activeView='interested';updateNavigation();location.hash='leads';}}}
    if(id==='copyPitch'){const l=leads.find(x=>x.id===activeId);try{await navigator.clipboard.writeText(activeMessage(l));notify('Active message copied.')}catch(err){const field=$(isNew(l)?'detailPitch':'detailFollowupPitch');field?.select();notify('Select and copy your message.')}}
    if(id==='waLead')openWhatsApp();if(id==='callLead')callLead();if(id==='markSent')markAction('sent');if(id==='moveToNew')markAction('new');if(id==='markFollowup')markAction('followup');if(id==='goMessageManager'){closeLead();activeView='messages';updateNavigation()}
   });
  }
  try{bind();updateNavigation();render()}catch(uiError){
   $('loginError').textContent='CRM interface setup failed: '+(uiError?.message||String(uiError));
   console.error('CRM interface initialization failed:',uiError);
  }
  try{await window.UnboxedCloud?.ready?.()}catch(e){
   $('loginError').textContent='Supabase connection setup failed: '+(e?.message||String(e));
   console.error('Supabase startup failed:',e);
  }
  $('logoutBtn').addEventListener('click',async()=>{
   if(syncPending>0){notify('Finish syncing your leads before signing out.');return}
   try{await window.UnboxedCloud.signOut();leads=[];selected.clear();synced.clear();cloudReady=false;render();document.body.classList.add('auth-locked');$('authGate').hidden=false;notify('Signed out.')}catch(e){notify('Sign out failed: '+e.message)}
  });
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Supabase unavailable.';return}
  try{const sess=await window.UnboxedCloud.session();if(sess?.user)await enterCloud()}catch(e){$('loginError').textContent='Session error: '+e.message}
 }
 bootstrap();
})();
