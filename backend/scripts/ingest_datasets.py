#!/usr/bin/env python3
"""
Unifies all 5 Indian food/recipe datasets into a single normalized catalog:
  1. EDA-On-Indian-Food/IndianDishes.csv
  2. Indian-Food/IndianFoodDataset.csv
  3. eastern-food-harvardstudy/05Database_of eastern_indian_dishes.xlsx
  4. food-eaten-in-india/{recipes,ingredients,instructions,regions}.csv
  5. sangat-food-db/data/**/*.json

Outputs: backend/data/recipes_catalog.json
"""

import csv
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DBS_DIR = os.path.join(ROOT_DIR, 'dbs')
OUTPUT_PATH = os.path.join(ROOT_DIR, 'backend', 'data', 'recipes_catalog.json')

STATE_CODE_MAP = {
    'AN': 'Andaman & Nicobar',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CT': 'Chhattisgarh',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HP': 'Himachal Pradesh',
    'JH': 'Jharkhand',
    'JK': 'Jammu & Kashmir',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LAN': 'Ladakh & Northern',
    'MH': 'Maharashtra',
    'ML': 'Meghalaya',
    'MN': 'Manipur',
    'MP': 'Madhya Pradesh',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OR': 'Odisha',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TG': 'Telangana',
    'TN': 'Tamil Nadu',
    'TR': 'Tripura',
    'UT': 'Uttarakhand',
    'WB': 'West Bengal',
    'popular': 'Pan-Indian Popular',
}


def clean_text(val):
    if not val:
        return ''
    return re.sub(r'\s+', ' ', str(val).replace('\xa0', ' ')).strip()


def normalize_title_key(title):
    t = clean_text(title).lower()
    t = re.sub(r'\brecipe\b', '', t)
    t = re.sub(r'[^a-z0-9]+', ' ', t).strip()
    return t


def parse_int(val, default=0):
    try:
        n = int(float(str(val).strip()))
        return n if n >= 0 else default
    except Exception:
        return default


def split_ingredients(raw):
    if not raw:
        return []
    parts = [clean_text(p) for p in re.split(r',|\n|;', raw)]
    return [p for p in parts if p]


def split_steps(raw):
    if not raw:
        return []
    text = clean_text(raw)
    if not text:
        return []
    # Split on sentence boundaries or numbered steps if long
    parts = [clean_text(s) for s in re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])|\n+', text)]
    return [p for p in parts if len(p) > 3]


def classify_category(source, region, total_time, course='', diet=''):
    reg_low = (region or '').lower()
    if source in ('eastern-food-harvardstudy',):
        return 'Local Traditional'
    if source == 'food-eaten-in-india':
        if 'popular' in reg_low:
            return 'Quick Everyday' if 0 < total_time <= 25 else 'Known Classic'
        return 'Local Traditional'
    if 0 < total_time <= 20:
        return 'Quick Everyday'
    if any(k in reg_low for k in ['bengal', 'bihar', 'odisha', 'assam', 'kerala', 'maharashtra', 'rajasthan', 'gujarat', 'northeast', 'kashmir', 'goa', 'andhra', 'tamil', 'karnataka', 'uttarakhand', 'jharkhand', 'chhattisgarh', 'manipur', 'nagaland', 'sikkim', 'tripura', 'meghalaya', 'mizoram', 'arunachal', 'himachal']):
        return 'Local Traditional'
    return 'Known Classic'


def estimate_difficulty(total_time, num_steps):
    if (0 < total_time <= 25) or (0 < num_steps <= 4):
        return 'Easy'
    if total_time >= 60 or num_steps >= 10:
        return 'Hard'
    return 'Medium'


def load_eda_indian_food():
    path = os.path.join(DBS_DIR, 'EDA-On-Indian-Food', 'IndianDishes.csv')
    items = []
    with open(path, newline='', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            title = clean_text(row.get('name'))
            if not title:
                continue
            prep = parse_int(row.get('prep_time'), 0)
            cook = parse_int(row.get('cook_time'), 0)
            total = prep + cook
            state = clean_text(row.get('state'))
            region = clean_text(row.get('region'))
            region_label = state if state and state != '-1' else (region if region and region != '-1' else 'Indian')
            ingredients = split_ingredients(row.get('ingredients'))
            flavor = clean_text(row.get('flavor_profile'))
            course = clean_text(row.get('course'))
            diet = clean_text(row.get('diet'))

            desc_parts = []
            if diet and diet != '-1':
                desc_parts.append(diet)
            if course and course != '-1':
                desc_parts.append(course)
            if flavor and flavor != '-1':
                desc_parts.append(f'{flavor} flavor')
            if region_label != 'Indian':
                desc_parts.append(f'traditional dish from {region_label}')
            description = ', '.join(desc_parts).capitalize() + '.' if desc_parts else 'Traditional Indian dish.'

            items.append({
                'id': f'eda-{idx+1}',
                'title': title,
                'localName': '',
                'category': classify_category('EDA-On-Indian-Food', region_label, total, course, diet),
                'region': region_label,
                'cuisine': 'Indian',
                'course': course if course != '-1' else '',
                'diet': diet if diet != '-1' else '',
                'prepTimeMinutes': prep,
                'cookTimeMinutes': cook if cook > 0 else 20,
                'totalTimeMinutes': total if total > 0 else 25,
                'difficulty': estimate_difficulty(total, 0),
                'ingredients': ingredients,
                'steps': [],
                'description': description,
                'chefTip': f'Balanced {flavor} profile.' if flavor and flavor != '-1' else '',
                'url': '',
                'source': 'EDA-On-Indian-Food',
            })
    return items


def load_indian_food_dataset():
    path = os.path.join(DBS_DIR, 'Indian-Food', 'IndianFoodDataset.csv')
    items = []
    with open(path, newline='', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            title = clean_text(row.get('TranslatedRecipeName')) or clean_text(row.get('RecipeName'))
            if not title:
                continue
            raw_ing = clean_text(row.get('TranslatedIngredients')) or clean_text(row.get('Ingredients'))
            raw_inst = clean_text(row.get('TranslatedInstructions')) or clean_text(row.get('Instructions'))
            prep = parse_int(row.get('PrepTimeInMins'), 0)
            cook = parse_int(row.get('CookTimeInMins'), 0)
            total = parse_int(row.get('TotalTimeInMins'), prep + cook)
            cuisine = clean_text(row.get('Cuisine')) or 'Indian'
            course = clean_text(row.get('Course'))
            diet = clean_text(row.get('Diet'))
            url = clean_text(row.get('URL'))

            ingredients = split_ingredients(raw_ing)
            steps = split_steps(raw_inst)

            desc_parts = [p for p in [cuisine, course, diet] if p]
            description = ' | '.join(desc_parts) if desc_parts else 'Indian home-style recipe.'

            items.append({
                'id': f'ifd-{idx+1}',
                'title': title,
                'localName': clean_text(row.get('RecipeName')) if clean_text(row.get('RecipeName')) != title else '',
                'category': classify_category('Indian-Food', cuisine, total, course, diet),
                'region': cuisine,
                'cuisine': cuisine,
                'course': course,
                'diet': diet,
                'prepTimeMinutes': prep,
                'cookTimeMinutes': cook if cook > 0 else (total if total > 0 else 25),
                'totalTimeMinutes': total if total > 0 else 30,
                'difficulty': estimate_difficulty(total, len(steps)),
                'ingredients': ingredients,
                'steps': steps,
                'description': description,
                'chefTip': f'Serves {clean_text(row.get("Servings"))}.' if clean_text(row.get('Servings')) else '',
                'url': url,
                'source': 'Indian-Food',
            })
    return items


def parse_xlsx_sheet(z, shared, sheet_path):
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    root = ET.fromstring(z.read(sheet_path))
    rows = []
    for r in root.findall('.//s:row', ns):
        vals = []
        for c in r.findall('s:c', ns):
            t = c.attrib.get('t')
            v = c.find('s:v', ns)
            if v is not None:
                val = shared[int(v.text)] if t == 's' else v.text
                vals.append(clean_text(val))
            else:
                vals.append('')
        if any(vals):
            rows.append(vals)
    if not rows:
        return []
    header = rows[0]
    dicts = []
    for row in rows[1:]:
        d = {}
        for i, h in enumerate(header):
            d[h] = row[i] if i < len(row) else ''
        dicts.append(d)
    return dicts


def load_eastern_food_harvard():
    path = os.path.join(DBS_DIR, 'eastern-food-harvardstudy', '05Database_of eastern_indian_dishes.xlsx')
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in root.findall('s:si', ns):
                shared.append(''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')))

        dishes = parse_xlsx_sheet(z, shared, 'xl/worksheets/sheet2.xml')
        ing_rows = parse_xlsx_sheet(z, shared, 'xl/worksheets/sheet3.xml')
        occ_rows = parse_xlsx_sheet(z, shared, 'xl/worksheets/sheet4.xml')

    ing_by_dish = defaultdict(list)
    kcal_by_dish = defaultdict(float)
    for r in ing_rows:
        dish = clean_text(r.get('Dish'))
        ing = clean_text(r.get('Ingredient'))
        amt = clean_text(r.get('Amt_gm'))
        if dish and ing:
            ing_by_dish[dish.lower()].append(f'{ing} ({amt}g)' if amt else ing)
        try:
            kcal_by_dish[dish.lower()] += float(r.get('Energy_kcal') or 0)
        except ValueError:
            pass

    occ_by_dish = defaultdict(set)
    for r in occ_rows:
        dish = clean_text(r.get('Dish'))
        occ = clean_text(r.get('Occasion'))
        if dish and occ:
            occ_by_dish[dish.lower()].add(occ)

    items = []
    for idx, d in enumerate(dishes):
        title = clean_text(d.get('Dish'))
        if not title:
            continue
        desc = clean_text(d.get('Description'))
        cls = clean_text(d.get('Classification'))
        key = title.lower()
        ings = ing_by_dish.get(key, [])
        occs = sorted(occ_by_dish.get(key, set()))
        kcal = round(kcal_by_dish.get(key, 0))

        steps = [desc] if desc else []
        tip_parts = []
        if occs:
            tip_parts.append(f'Traditionally served for: {", ".join(occs)}')
        if kcal > 0:
            tip_parts.append(f'Approx. {kcal} kcal per documented serving')

        items.append({
            'id': f'harvard-wb-{idx+1}',
            'title': title,
            'localName': '',
            'category': 'Local Traditional',
            'region': 'West Bengal (Eastern India)',
            'cuisine': 'Bengali / Eastern Indian',
            'course': ', '.join(occs) if occs else cls,
            'diet': '',
            'prepTimeMinutes': 10,
            'cookTimeMinutes': 20,
            'totalTimeMinutes': 30,
            'difficulty': 'Easy',
            'ingredients': ings,
            'steps': steps,
            'description': desc or f'Traditional Eastern Indian {cls.lower()} preparation.',
            'chefTip': '. '.join(tip_parts),
            'url': '',
            'source': 'eastern-food-harvardstudy',
        })
    return items


def load_food_eaten_in_india():
    base = os.path.join(DBS_DIR, 'food-eaten-in-india')

    ing_by_id = defaultdict(list)
    with open(os.path.join(base, 'ingredients.csv'), newline='', encoding='utf-8', errors='replace') as f:
        for r in csv.DictReader(f):
            rid = clean_text(r.get('Recipe Id'))
            name = clean_text(r.get('Name'))
            amt = clean_text(r.get('Amount'))
            unit = clean_text(r.get('Unit'))
            if rid and name:
                qty = ' '.join(p for p in [amt, unit] if p and p != '-1')
                ing_by_id[rid].append(f'{name} ({qty})' if qty else name)

    steps_by_id = defaultdict(list)
    with open(os.path.join(base, 'instructions.csv'), newline='', encoding='utf-8', errors='replace') as f:
        rows = list(csv.DictReader(f))
        rows.sort(key=lambda x: parse_int(x.get('Step Count'), 0))
        for r in rows:
            rid = clean_text(r.get('Recipe Id'))
            msg = clean_text(r.get('Message'))
            if rid and msg:
                steps_by_id[rid].append(msg)

    regions_by_id = defaultdict(list)
    with open(os.path.join(base, 'regions.csv'), newline='', encoding='utf-8', errors='replace') as f:
        for r in csv.DictReader(f):
            rid = clean_text(r.get('Recipe Id'))
            code = clean_text(r.get('Region Code'))
            if rid and code:
                regions_by_id[rid].append(STATE_CODE_MAP.get(code, code))

    items = []
    with open(os.path.join(base, 'recipes.csv'), newline='', encoding='utf-8', errors='replace') as f:
        for idx, r in enumerate(csv.DictReader(f)):
            rid = clean_text(r.get('Recipe Id'))
            title = clean_text(r.get('Recipe Name English'))
            if not title:
                continue
            local_name = clean_text(r.get('Recipe Name Local'))
            is_non_veg = clean_text(r.get('Is Non Veg')).lower() == 'true'
            active_sec = parse_int(r.get('Total Active Time'), 0)
            passive_sec = parse_int(r.get('Total Passive Time'), 0)
            total_mins = max(5, round((active_sec + passive_sec) / 60)) if (active_sec + passive_sec) > 0 else 25
            regions = regions_by_id.get(rid, ['Indian'])
            region_label = ', '.join(dict.fromkeys(regions))
            extra = clean_text(r.get('Extra Info'))
            warning = clean_text(r.get('Warning'))
            steps = steps_by_id.get(rid, [])
            ings = ing_by_id.get(rid, [])

            items.append({
                'id': f'feii-{rid or idx+1}',
                'title': title,
                'localName': local_name if local_name != title else '',
                'category': classify_category('food-eaten-in-india', region_label, total_mins),
                'region': region_label,
                'cuisine': region_label,
                'course': '',
                'diet': 'Non Vegeterian' if is_non_veg else 'Vegetarian',
                'prepTimeMinutes': round(active_sec / 60) if active_sec > 0 else 10,
                'cookTimeMinutes': total_mins,
                'totalTimeMinutes': total_mins,
                'difficulty': estimate_difficulty(total_mins, len(steps)),
                'ingredients': ings,
                'steps': steps,
                'description': extra if extra else f'Authentic regional dish from {region_label}.',
                'chefTip': warning if warning else (f'Local name: {local_name}' if local_name else ''),
                'url': '',
                'source': 'food-eaten-in-india',
            })
    return items


def load_sangat_food_db():
    data_dir = os.path.join(DBS_DIR, 'sangat-food-db', 'data')
    items = []
    for root_path, _, files in os.walk(data_dir):
        for fname in files:
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(root_path, fname)
            with open(fpath, encoding='utf-8') as f:
                d = json.load(f)
            title = clean_text(d.get('name_en'))
            if not title:
                continue
            ings = split_ingredients(d.get('ingredients_summary', ''))
            macros = d.get('macros_per_100g') or {}
            macro_str = f"{macros.get('kcal', '?')} kcal, {macros.get('protein_g', '?')}g protein per 100g" if macros else ''
            region = clean_text(d.get('region')).capitalize() or 'Indian'

            items.append({
                'id': f"sangat-{d.get('id', fname)}",
                'title': title,
                'localName': clean_text(d.get('name_hi')),
                'category': 'Known Classic',
                'region': region,
                'cuisine': 'Indian',
                'course': clean_text(d.get('category')),
                'diet': 'Vegetarian' if d.get('veg') else 'Non-Vegetarian',
                'prepTimeMinutes': 10,
                'cookTimeMinutes': 20,
                'totalTimeMinutes': 30,
                'difficulty': 'Easy',
                'ingredients': ings,
                'steps': [],
                'description': clean_text(d.get('notes')) or f'Staple Indian dish ({macro_str}).',
                'chefTip': macro_str,
                'url': '',
                'source': 'sangat-food-db',
            })
    return items


def load_culinary_db():
    details_path = os.path.join(DBS_DIR, 'CulinaryDB', '01_Recipe_Details.csv')
    aliases_path = os.path.join(DBS_DIR, 'CulinaryDB', '04_Recipe-Ingredients_Aliases.csv')
    ing_meta_path = os.path.join(DBS_DIR, 'CulinaryDB', '02_Ingredients.csv')
    if not os.path.exists(details_path):
        return []

    nonveg_entities = set()
    if os.path.exists(ing_meta_path):
        with open(ing_meta_path, newline='', encoding='utf-8', errors='replace') as f:
            for row in csv.DictReader(f):
                cat = clean_text(row.get('Category')).lower()
                name = clean_text(row.get('Aliased Ingredient Name')).lower()
                if cat in ('meat', 'fish', 'seafood', 'poultry') or any(
                    k in name for k in ('chicken', 'mutton', 'lamb', 'beef', 'pork', 'fish', 'prawn', 'shrimp', 'crab', 'egg', 'meat')
                ):
                    eid = clean_text(row.get('Entity ID'))
                    if eid:
                        nonveg_entities.add(eid)

    indian_recipes = {}
    with open(details_path, newline='', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            cuisine = clean_text(row.get('Cuisine'))
            if cuisine.lower() != 'indian subcontinent':
                continue
            rid = clean_text(row.get('Recipe ID'))
            title = clean_text(row.get('Title'))
            if not rid or not title:
                continue
            indian_recipes[rid] = {
                'title': title.title(),
                'source_tag': clean_text(row.get('Source')),
            }

    recipe_ings = defaultdict(list)
    recipe_nonveg = set()
    if os.path.exists(aliases_path):
        with open(aliases_path, newline='', encoding='utf-8', errors='replace') as f:
            for row in csv.DictReader(f):
                rid = clean_text(row.get('Recipe ID'))
                if rid not in indian_recipes:
                    continue
                orig = clean_text(row.get('Original Ingredient Name')) or clean_text(row.get('Aliased Ingredient Name'))
                if orig:
                    recipe_ings[rid].append(orig)
                eid = clean_text(row.get('Entity ID'))
                if eid in nonveg_entities or any(
                    k in orig.lower() for k in ('chicken', 'mutton', 'lamb', 'fish', 'prawn', 'shrimp', 'egg', 'meat')
                ):
                    recipe_nonveg.add(rid)

    items = []
    for rid, info in indian_recipes.items():
        ings = list(dict.fromkeys(recipe_ings.get(rid, [])))
        if not ings:
            continue
        is_nonveg = rid in recipe_nonveg
        diet = 'Non-Vegetarian' if is_nonveg else 'Vegetarian'
        src_note = info['source_tag'].replace('_', ' ').title() if info['source_tag'] else 'CulinaryDB'
        items.append({
            'id': f'cdb-{rid}',
            'title': info['title'],
            'localName': '',
            'category': 'Known Classic',
            'region': 'Indian Subcontinent',
            'cuisine': 'Indian Subcontinent',
            'course': '',
            'diet': diet,
            'prepTimeMinutes': 10,
            'cookTimeMinutes': 25,
            'totalTimeMinutes': 35,
            'difficulty': 'Medium' if len(ings) >= 10 else 'Easy',
            'ingredients': ings,
            'steps': [],
            'description': f'{diet} Indian Subcontinent dish featuring {", ".join(ings[:5])}.',
            'chefTip': f'Curated from CulinaryDB ({src_note}).',
            'url': '',
            'source': 'CulinaryDB',
        })
    return items


def build_search_text(item):
    parts = [
        item['title'],
        item.get('localName', ''),
        item.get('category', ''),
        item.get('region', ''),
        item.get('diet', ''),
        item.get('course', ''),
        'Ingredients: ' + ', '.join(item.get('ingredients', [])),
        item.get('description', ''),
    ]
    return clean_text(' | '.join(p for p in parts if p))[:1500]


def main():
    all_raw = []
    loaders = [
        ('EDA-On-Indian-Food', load_eda_indian_food),
        ('Indian-Food', load_indian_food_dataset),
        ('eastern-food-harvardstudy', load_eastern_food_harvard),
        ('food-eaten-in-india', load_food_eaten_in_india),
        ('sangat-food-db', load_sangat_food_db),
        ('CulinaryDB (Indian Subcontinent)', load_culinary_db),
    ]

    for name, fn in loaders:
        loaded = fn()
        print(f'Loaded {len(loaded):5d} records from {name}')
        all_raw.extend(loaded)

    # Deduplicate by normalized title, keeping the entry with richer steps + ingredients
    dedup = {}
    for item in all_raw:
        key = normalize_title_key(item['title'])
        if not key:
            continue
        existing = dedup.get(key)
        if not existing:
            dedup[key] = item
        else:
            existing_score = len(existing['steps']) * 10 + len(existing['ingredients'])
            new_score = len(item['steps']) * 10 + len(item['ingredients'])
            if new_score > existing_score:
                # Preserve source provenance
                sources = set(existing['source'].split(', ')) | {item['source']}
                item['source'] = ', '.join(sorted(sources))
                dedup[key] = item
            else:
                sources = set(existing['source'].split(', ')) | {item['source']}
                existing['source'] = ', '.join(sorted(sources))

    catalog = []
    for item in dedup.values():
        item['searchText'] = build_search_text(item)
        catalog.append(item)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False)

    cat_counts = defaultdict(int)
    for c in catalog:
        cat_counts[c['category']] += 1

    print(f'\nUnified catalog saved to {OUTPUT_PATH}')
    print(f'Total unique dishes/recipes: {len(catalog)}')
    print('By category:', dict(cat_counts))


if __name__ == '__main__':
    main()
