#!/usr/bin/env python3
import os
import sys
import time
import json
import logging
import re
from datetime import datetime
import urllib.request
from urllib.parse import urljoin
import requests
import feedparser
import pymysql
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("crawler")

# Configuration and Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
TRACKER_FILE = os.path.join(SCRIPT_DIR, 'posted_links.json')

# Sources Config
# Sources Config
FEEDS = [
    {
        "name": "Hacker News",
        "url": "https://hnrss.org/frontpage",
        "default_category_slug": "developer-tools"
    },
    {
        "name": "GitHub Blog",
        "url": "https://github.blog/feed/",
        "default_category_slug": "open-source"
    },
    {
        "name": "Cloudflare Blog",
        "url": "https://blog.cloudflare.com/rss",
        "default_category_slug": "devops-cloud"
    },
    {
        "name": "OpenAI News",
        "url": "https://openai.com/news/rss.xml",
        "default_category_slug": "ai-tools"
    },
    {
        "name": "Anthropic News",
        "url": "https://www.anthropic.com/news/rss.xml",
        "default_category_slug": "ai-agent"
    },
    {
        "name": "AWS Blog",
        "url": "https://aws.amazon.com/blogs/aws/feed/",
        "default_category_slug": "devops-cloud"
    },
    {
        "name": "Google AI Blog",
        "url": "https://blog.google/technology/ai/rss/",
        "default_category_slug": "ai-tools"
    },
    {
        "name": "Microsoft Tech Community",
        "url": "https://techcommunity.microsoft.com/rss",
        "default_category_slug": "developer-tools"
    },
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "default_category_slug": "web-applications"
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "default_category_slug": "web-applications"
    },
    {
        "name": "Dev.to",
        "url": "https://dev.to/feed",
        "default_category_slug": "developer-tools"
    },
    {
        "name": "InfoQ",
        "url": "https://feed.infoq.com/",
        "default_category_slug": "backend"
    },
    {
        "name": "Towards Data Science",
        "url": "https://towardsdatascience.com/feed",
        "default_category_slug": "tutorials-learning"
    },
    {
        "name": "Kotaku (Gaming)",
        "url": "https://kotaku.com/rss",
        "default_category_slug": "game-development"
    },
    {
        "name": "Polygon (Gaming & Entertainment)",
        "url": "https://www.polygon.com/rss/index.xml",
        "default_category_slug": "game-development"
    },
    {
        "name": "GameSpot (Gaming News)",
        "url": "https://www.gamespot.com/feeds/mashup/",
        "default_category_slug": "game-development"
    },
    {
        "name": "VentureBeat (AI & Enterprise Tech)",
        "url": "https://venturebeat.com/feed/",
        "default_category_slug": "ai-tools"
    },
    {
        "name": "CSS-Tricks (Web Dev & CSS)",
        "url": "https://css-tricks.com/feed/",
        "default_category_slug": "frontend"
    },
    {
        "name": "Smashing Magazine (Web Design & UI/UX)",
        "url": "https://www.smashingmagazine.com/feed/",
        "default_category_slug": "ui-ux-resources"
    },
    {
        "name": "Ars Technica (Tech News & Reviews)",
        "url": "https://feeds.arstechnica.com/arstechnica/index",
        "default_category_slug": "security"
    },
    {
        "name": "Slashdot (Tech & Dev Community)",
        "url": "https://rss.slashdot.org/Slashdot/slashdotMain",
        "default_category_slug": "open-source"
    },
    {
        "name": "ZDNet (Enterprise Technology)",
        "url": "https://www.zdnet.com/news/rss.xml",
        "default_category_slug": "devops-cloud"
    },
    {
        "name": "Hacker Noon (Developer Articles)",
        "url": "https://hackernoon.com/feed",
        "default_category_slug": "tutorials-learning"
    },
    {
        "name": "The Register (Dev & Sysadmin News)",
        "url": "https://www.theregister.com/headlines.rss",
        "default_category_slug": "security"
    },
    {
        "name": "Phoronix (Linux & Hardware Open Source)",
        "url": "https://www.phoronix.com/rss.php",
        "default_category_slug": "open-source"
    },
    {
        "name": "The Next Web (TNW Startups & Tech)",
        "url": "https://thenextweb.com/feed",
        "default_category_slug": "web-applications"
    },
    {
        "name": "Eurogamer (Gaming News & Reviews)",
        "url": "https://www.eurogamer.net/feed",
        "default_category_slug": "game-development"
    }
]

# Helper to read environment variables from .env manually (zero external dependencies)
def load_env():
    env_paths = [
        os.path.join(ROOT_DIR, '.env'),
        os.path.join(os.getcwd(), '.env'),
        '.env'
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading configuration from: {env_path}")
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, val = line.split('=', 1)
                            # Strip whitespaces and quotes
                            val = val.strip().strip('"').strip("'")
                            os.environ[key.strip()] = val
                return True
            except Exception as e:
                logger.error(f"Error parsing .env file at {env_path}: {e}")
    return False

# Helper to strip HTML tags except <img> tags to preserve images
def clean_html_keep_images(html_content):
    if not html_content:
        return ""
    # Strip all HTML tags EXCEPT <img> tags
    # <(?!img\b)[^>]+> matches any tag that doesn't start with 'img'
    cleaned = re.sub(r'<(?!img\b)[^>]+>', ' ', html_content)
    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

# Keywords that signal a non-illustrative image (logos, icons, avatars, tracking pixels, ads)
_IMG_JUNK_PATTERNS = (
    'logo', 'icon', 'favicon', 'avatar', 'gravatar', 'sprite', 'emoji',
    'spacer', 'pixel', 'tracking', 'beacon', 'analytics', 'doubleclick',
    'badge', 'button', 'banner-ad', 'advert', '/ads/', 'ad_', '1x1',
    'placeholder', 'loading', 'blank.gif', 'transparent',
)

# Extract genuine illustrative images from an article's HTML so they can be
# woven back into the rewritten post (makes articles livelier and more engaging).
def extract_article_images(html, base_url, limit=6):
    if not html:
        return []

    images = []
    seen = set()

    # Prefer the main article region if we can isolate it; otherwise scan all.
    scope = html
    art_match = re.search(r'<article[^>]*>(.*?)</article>', html, re.DOTALL | re.IGNORECASE)
    if art_match and len(art_match.group(1)) > 500:
        scope = art_match.group(1)

    for tag in re.findall(r'<img\b[^>]*>', scope, re.IGNORECASE):
        # Prefer lazy-loaded high-res sources over placeholders.
        src = None
        for attr in ('data-src', 'data-original', 'data-lazy-src', 'src'):
            m = re.search(attr + r'=["\']([^"\']+)["\']', tag, re.IGNORECASE)
            if m:
                src = m.group(1).strip()
                if src and not src.startswith('data:'):
                    break
                src = None

        # Fall back to the first candidate in srcset (usually smallest → still usable).
        if not src:
            m = re.search(r'srcset=["\']([^"\']+)["\']', tag, re.IGNORECASE)
            if m:
                src = m.group(1).split(',')[0].strip().split(' ')[0]

        if not src or src.startswith('data:'):
            continue

        # Resolve protocol-relative and relative URLs against the page URL.
        if src.startswith('//'):
            src = 'https:' + src
        elif not src.startswith('http'):
            src = urljoin(base_url, src)

        src = src.replace('&amp;', '&')
        low = src.lower()

        # Skip tiny/decorative/tracking images and unsupported formats.
        if any(junk in low for junk in _IMG_JUNK_PATTERNS):
            continue
        if low.endswith('.svg') or low.endswith('.gif'):
            continue

        # Drop images explicitly declared very small via width/height attributes.
        wh = re.findall(r'(?:width|height)=["\']?(\d+)', tag, re.IGNORECASE)
        if wh and any(int(v) < 200 for v in wh):
            continue

        # Normalize for de-duplication (ignore query string variations).
        key = src.split('?')[0]
        if key in seen:
            continue
        seen.add(key)

        alt_match = re.search(r'alt=["\']([^"\']*)["\']', tag, re.IGNORECASE)
        alt = (alt_match.group(1).strip() if alt_match else '') or 'Hình minh họa'
        alt = re.sub(r'\s+', ' ', alt)[:120]

        images.append({"url": src, "alt": alt})
        if len(images) >= limit:
            break

    return images

# Fetch full article text (paragraphs, headers, lists) and og:image from target website (Full-Text Scraping)
def fetch_full_article(url):
    logger.info(f"Scraping full-text article from: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            html_bytes = response.read()
            
        html = html_bytes.decode('utf-8', errors='ignore')
        
        # 1. Extract og:image
        thumbnail_url = None
        og_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', html, re.IGNORECASE)
        if not og_match:
            og_match = re.search(r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
        if not og_match:
            og_match = re.search(r'<meta[^>]+name=["\']twitter:image["\']\s+content=["\'](https?://[^"\']+)["\']', html, re.IGNORECASE)
            
        if og_match:
            thumbnail_url = og_match.group(1).strip()
            thumbnail_url = thumbnail_url.replace('&amp;', '&')

        # 1b. Extract in-article illustrative images to enrich the rewritten post
        article_images = extract_article_images(html, url)
        # Ensure the cover/og:image is available as an in-body candidate too
        if thumbnail_url and not any(img['url'].split('?')[0] == thumbnail_url.split('?')[0] for img in article_images):
            article_images.insert(0, {"url": thumbnail_url, "alt": "Ảnh bìa bài viết"})
        if article_images:
            logger.info(f"Extracted {len(article_images)} illustrative image(s) from {url}")

        # 2. Extract article structured elements: p, h1, h2, h3, h4, li
        # Extract elements in order to preserve article structure
        elements = re.findall(r'<(p|h1|h2|h3|h4|li)[^>]*>(.*?)</\1>', html, re.DOTALL | re.IGNORECASE)
        cleaned_elements = []
        for tag, content in elements:
            tag = tag.lower()
            # Strip internal HTML tags
            content_clean = re.sub(r'<[^>]+>', '', content).strip()
            # Unescape basic entities
            content_clean = content_clean.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
            
            # Avoid utility elements and short footer texts
            # Lower limit to 5 to preserve short code lines, list items, and shell commands
            if len(content_clean) > 5 and not any(term in content_clean for term in ('Cookie', 'Sign up', 'Subscribe', 'Follow us', 'Terms of Service', 'Privacy Policy', 'Login', 'Register')):
                if tag.startswith('h'):
                    # Format as markdown headers for Gemini to recognize layout structure
                    cleaned_elements.append(f"## {content_clean}")
                elif tag == 'li':
                    cleaned_elements.append(f"- {content_clean}")
                else:
                    cleaned_elements.append(content_clean)
                    
        # Combine the first 120 elements (gives extremely detailed coverage of the article)
        full_text = "\n\n".join(cleaned_elements[:120])
        
        if full_text:
            logger.info(f"Successfully scraped {len(cleaned_elements[:120])} structured elements from {url}")
            return full_text, thumbnail_url, article_images

    except Exception as e:
        logger.warning(f"Failed to scrape full text from {url}: {e}")

    return None, None, []

# Load local list of posted links
def load_posted_links():
    if os.path.exists(TRACKER_FILE):
        try:
            with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return set(data)
        except Exception as e:
            logger.error(f"Error reading local duplicate tracker file: {e}")
    return set()

# Save a link to local posted links file
def save_posted_link(link):
    posted = load_posted_links()
    posted.add(link)
    try:
        with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
            json.dump(list(posted), f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error writing to local duplicate tracker file: {e}")

# Get database connection credentials if available
def get_db_config():
    if not os.environ.get('DB_HOST'):
        # If env variables aren't loaded yet
        load_env()
    
    if os.environ.get('DB_HOST'):
        return {
            'host': os.environ.get('DB_HOST', '127.0.0.1'),
            'port': int(os.environ.get('DB_PORT', '3306')),
            'user': os.environ.get('DB_USER', 'root'),
            'password': os.environ.get('DB_PASSWORD', 'root'),
            'database': os.environ.get('DB_NAME', 'hidev_db')
        }
    return None

# Check if a link has been posted, querying MySQL directly if available, otherwise local file tracker
def check_duplicate(link, db_config):
    # Try MySQL first
    if db_config:
        try:
            conn = pymysql.connect(
                host=db_config['host'],
                port=db_config['port'],
                user=db_config['user'],
                password=db_config['password'],
                database=db_config['database'],
                charset='utf8mb4',
                connect_timeout=3
            )
            try:
                with conn.cursor() as cursor:
                    # Look up exact link or search for trailing/leading variations
                    cursor.execute("SELECT 1 FROM posts WHERE link = %s", (link,))
                    if cursor.fetchone():
                        return True
            finally:
                conn.close()
        except Exception as e:
            logger.warning(f"MySQL connection duplicate check failed: {e}. Falling back to local tracker.")
            
    # Check local JSON tracker
    posted_links = load_posted_links()
    return link in posted_links

# Fetch and parse RSS feed (with custom fallback parser if feedparser fails)
def fetch_rss_entries(feed_url):
    try:
        # Try using feedparser first
        logger.info(f"Fetching RSS feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        # If feedparser successfully parsed entries
        if feed.entries:
            entries = []
            for entry in feed.entries:
                title = getattr(entry, 'title', '').strip()
                link = getattr(entry, 'link', '').strip()
                
                # Try getting summary/content
                description = ''
                if hasattr(entry, 'summary'):
                    description = entry.summary
                elif hasattr(entry, 'content') and len(entry.content) > 0:
                    description = entry.content[0].value
                elif hasattr(entry, 'description'):
                    description = entry.description
                
                # Clean HTML but preserve <img> tags for Gemini to extract images
                description = clean_html_keep_images(description)
                
                if title and link:
                    entries.append({
                        "title": title,
                        "link": link,
                        "description": description
                    })
            return entries
    except Exception as e:
        logger.error(f"feedparser failed for {feed_url}: {e}. Retrying with built-in XML parser...")
        
    # Standard library fallback XML parser
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        req = urllib.request.Request(feed_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        xml_str = xml_data.decode('utf-8', errors='ignore')
        # Clean namespaces to simplify XPath parsing
        xml_str = re.sub(r'\sxmlns="[^"]+"', '', xml_str)
        xml_str = re.sub(r'\sxmlns:[a-zA-Z0-9]+="[^"]+"', '', xml_str)
        xml_str = re.sub(r'<[a-zA-Z0-9]+:', '<', xml_str)
        xml_str = re.sub(r'</[a-zA-Z0-9]+:', '</', xml_str)
        
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_str)
        
        entries = []
        # RSS <item> check
        for item in root.findall('.//item'):
            title = (item.findtext('title') or '').strip()
            link = (item.findtext('link') or '').strip()
            desc = (item.findtext('description') or '').strip()
            desc = clean_html_keep_images(desc)
            if title and link:
                entries.append({"title": title, "link": link, "description": desc})
                
        # Atom <entry> check
        if not entries:
            for entry in root.findall('.//entry'):
                title = (entry.findtext('title') or '').strip()
                link = ''
                link_node = entry.find('link')
                if link_node is not None:
                    link = link_node.get('href', '').strip()
                if not link:
                    link = (entry.findtext('link') or '').strip()
                    
                desc = (entry.findtext('summary') or entry.findtext('content') or '').strip()
                desc = clean_html_keep_images(desc)
                if title and link:
                    entries.append({"title": title, "link": link, "description": desc})
                    
        return entries
    except Exception as e:
        logger.error(f"Fallback built-in XML parser also failed for {feed_url}: {e}")
        return []

current_key_index = 0

# Call Gemini API with automatic key rotation and model fallback
def call_gemini_with_rotation(prompt, generation_config, model_name="gemini-3.1-flash-lite"):
    global current_key_index
    raw_api_keys = os.environ.get("GEMINI_API_KEY", "")
    api_keys = [k.strip() for k in raw_api_keys.split(",") if k.strip()]
    
    if not api_keys:
        logger.error("GEMINI_API_KEY environment variable is empty or not set!")
        return None
        
    num_keys = len(api_keys)
    
    # Priority list of models (ordered from highest quality to lowest/backup).
    # Only real, generateContent-capable models — invalid names waste quota/time.
    models_to_try = [model_name]
    for fallback in ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)
            
    # Convert old generation_config dict to types.GenerateContentConfig
    config_obj = types.GenerateContentConfig(
        response_mime_type=generation_config.get("response_mime_type"),
        temperature=generation_config.get("temperature"),
        max_output_tokens=generation_config.get("max_output_tokens")
    )
            
    # First outer loop: Iterate through models from high quality to backup
    for current_model in models_to_try:
        logger.info(f"Attempting to use model '{current_model}' across available keys...")

        model_unavailable = False

        # Second inner loop: Try all API keys for the current model before downgrading model quality
        for attempt in range(num_keys):
            key = api_keys[current_key_index]
            masked_key = key[:6] + "..." + key[-4:] if len(key) > 10 else "..."

            try:
                client = genai.Client(api_key=key)

                logger.info(f"Trying Key index {current_key_index} ({masked_key}) with model '{current_model}' (Attempt {attempt + 1}/{num_keys})")
                response = client.models.generate_content(
                    model=current_model,
                    contents=prompt,
                    config=config_obj
                )

                if response and response.text:
                    # Success: advance key index to distribute load round-robin
                    current_key_index = (current_key_index + 1) % num_keys
                    return response

            except Exception as e:
                err_msg = str(e)
                err_lower = err_msg.lower()

                # Model-level errors (404 not found / not supported) are the same
                # for every key — skip the whole model immediately instead of
                # wasting one failed attempt per key.
                if '404' in err_msg or 'not found' in err_lower or 'not supported' in err_lower:
                    logger.warning(f"Model '{current_model}' is unavailable ({err_msg.splitlines()[0][:120]}). Skipping to next model.")
                    model_unavailable = True
                    break

                logger.warning(f"Key index {current_key_index} failed with model '{current_model}': {err_msg.splitlines()[0][:160]}")

                # Advance to next key for the next attempt
                current_key_index = (current_key_index + 1) % num_keys
                if num_keys > 1:
                    time.sleep(0.5)

        if not model_unavailable:
            logger.warning(f"All keys exhausted or failed for model '{current_model}'. Trying next fallback model...")

    logger.error("All configured Gemini API keys and fallback models failed.")
    return None

# Query diverse posts from the database to use as internal linking candidates
def get_recent_posts(db_config, category_id=None, limit=150):
    if not db_config:
        return []
    try:
        conn = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
            charset='utf8mb4',
            connect_timeout=3
        )
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                posts = []
                
                # 1. Fetch posts from the same category to maximize contextual relevance
                if category_id:
                    cursor.execute(
                        "SELECT title, slug FROM posts WHERE status = 'approved' AND category_id = %s ORDER BY id DESC LIMIT 50",
                        (category_id,)
                    )
                    posts.extend(cursor.fetchall())
                
                # 2. Fetch popular posts (cornerstone content with high upvotes)
                cursor.execute(
                    """
                    SELECT p.title, p.slug 
                    FROM posts p
                    LEFT JOIN (SELECT post_id, COUNT(*) as votes FROM upvotes GROUP BY post_id) v ON v.post_id = p.id
                    WHERE p.status = 'approved'
                    ORDER BY COALESCE(v.votes, 0) DESC, p.id DESC
                    LIMIT 50
                    """
                )
                posts.extend(cursor.fetchall())
                
                # 3. Fetch recent overall to ensure fresh content is included
                cursor.execute(
                    "SELECT title, slug FROM posts WHERE status = 'approved' ORDER BY id DESC LIMIT 50"
                )
                posts.extend(cursor.fetchall())
                
                # De-duplicate by slug
                seen = set()
                deduped_posts = []
                for p in posts:
                    if p['slug'] not in seen:
                        seen.add(p['slug'])
                        deduped_posts.append(p)
                
                # Limit the final pool to the requested limit
                return deduped_posts[:limit]
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Failed to fetch diverse posts for internal linking: {e}")
    return []

# Query all available categories dynamically from database
def get_all_categories(db_config):
    default_cats = [
        {"id": 1, "name": "Developer Tools"},
        {"id": 2, "name": "AI Tools"},
        {"id": 3, "name": "Libraries & Frameworks"},
        {"id": 4, "name": "Web Applications"},
        {"id": 5, "name": "UI/UX Resources"}
    ]
    if not db_config:
        return default_cats
    try:
        conn = pymysql.connect(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
            charset='utf8mb4',
            connect_timeout=3
        )
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute("SELECT id, name FROM categories ORDER BY id ASC")
                results = cursor.fetchall()
                if results:
                    return results
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Failed to fetch categories from database: {e}. Using default fallbacks.")
    return default_cats

# Rewrite content using Gemini API
def rewrite_with_gemini(title, original_link, description, default_cat_id, scraped_thumbnail=None, recent_posts=None, db_categories=None, article_images=None):
    raw_api_keys = os.environ.get("GEMINI_API_KEY", "")
    if not raw_api_keys.strip():
        logger.error("GEMINI_API_KEY environment variable is not set!")
        return None
        
    try:
        # Use the model specified in .env, defaulting to gemini-3.1-flash-lite for its high 500 RPD quota
        model_name = os.environ.get('GEMINI_MODEL', 'gemini-3.1-flash-lite')
        
        # Truncate content to 10,000 characters to save input tokens
        truncated_desc = description
        if truncated_desc and len(truncated_desc) > 10000:
            truncated_desc = truncated_desc[:10000] + "\n\n...(Nội dung gốc quá dài nên được cắt bớt để tối ưu hóa token)..."
        
        # Build candidate links for internal linking
        candidates_str = ""
        if recent_posts:
            candidates_str = "\nCác bài viết liên quan có sẵn trên hidev.dev để chèn liên kết nội bộ:\n"
            for p in recent_posts:
                candidates_str += f"- Tiêu đề: \"{p['title']}\" -> Đường dẫn: `/posts/{p['slug']}`\n"

        # Build the pool of illustrative images scraped from the source article
        images_str = ""
        if article_images:
            images_str = "\nDanh sách các HÌNH ẢNH MINH HỌA THẬT đã thu thập được từ bài viết gốc (hãy chèn chúng vào các vị trí phù hợp trong nội dung để bài viết sinh động, hấp dẫn hơn):\n"
            for idx, img in enumerate(article_images, 1):
                images_str += f"{idx}. URL: {img['url']} | Mô tả gợi ý (alt): {img['alt']}\n"
                
        # Build categories string dynamically
        categories_list_str = ""
        valid_cat_ids = []
        categories_source = db_categories if db_categories else [
            {"id": 1, "name": "Developer Tools"},
            {"id": 2, "name": "AI Tools"},
            {"id": 3, "name": "Libraries & Frameworks"},
            {"id": 4, "name": "Web Applications"},
            {"id": 5, "name": "UI/UX Resources"}
        ]
        for cat in categories_source:
            categories_list_str += f"           - {cat['id']}: {cat['name']}\n"
            valid_cat_ids.append(cat['id'])
        
        prompt = f"""
        Bạn là Tổng Biên tập kiêm Senior Tech Lead của blog hi_dev — một trong những cộng đồng chia sẻ công cụ lập trình & sản phẩm công nghệ uy tín hàng đầu Việt Nam. Bạn nổi tiếng với những bài viết chuẩn chỉnh, chuyên sâu, đáng tin cậy và cực kỳ cuốn hút, được hàng chục nghìn lập trình viên tin tưởng và chia sẻ.
        Nhiệm vụ của bạn là biên tập lại tin tức công nghệ dưới đây thành một BÀI VIẾT ĐẲNG CẤP CHUYÊN GIA (premium editorial) — vừa uy tín, chính xác về mặt kỹ thuật, vừa hấp dẫn giữ chân người đọc từ dòng đầu đến dòng cuối.
        Dưới đây là một bài viết công nghệ thu thập được từ RSS:
        - Tiêu đề gốc: {title}
        - Liên kết nguồn: {original_link}
        - Nội dung gốc (đầy đủ chi tiết): {truncated_desc}
        - Ảnh Thumbnail thu thập được (nếu có): {scraped_thumbnail or 'None'}
        {candidates_str}
        {images_str}

        Hãy thực hiện các yêu cầu sau để tạo ra một bài viết đầy đủ, chi tiết, hoàn chỉnh, có giá trị chuyên môn cao nhất và được tối ưu hóa SEO tốt nhất:
        1. BẮT BUỘC viết một bài viết cực kỳ chi tiết, đầy đủ thông tin kỹ thuật và chiều sâu. TUYỆT ĐỐI không được tóm tắt ngắn gọn hay cắt bớt nội dung. Hãy dịch, phân tích và giải thích cặn kẽ tất cả các luận điểm, số liệu, thông số kỹ thuật, tên công cụ, câu lệnh cài đặt/chạy (commands), các đoạn mã nguồn (code blocks) và các liên kết có trong nội dung gốc để người đọc có thể hiểu rõ và thực hành được ngay. Phân chia bài viết thành các mục lớn/nhỏ (H2, H3, H4) rõ ràng.
        2. HÀNH VĂN CHUYÊN NGHIỆP & TỰ NHIÊN: Sử dụng ngôn phong mượt mà, cuốn hút như một bài blog kỹ thuật chất lượng cao (Tech Lead chắp bút). Giữ nguyên các thuật ngữ kỹ thuật phổ biến mà giới lập trình Việt Nam hay dùng thay vì dịch thô gượng ép (ví dụ: giữ nguyên 'API endpoint', 'repository', 'middleware', 'runtime', 'framework', 'database', 'query', 'deploy', 'refactor', 'state management', 'caching', 'load balancing', 'asynchronous', 'downtime'...).
        3. BẮT BUỘC THÊM PHẦN ĐÁNH GIÁ CHUYÊN SÂU (Expert Review): Ở phần cuối bài viết (trước kết luận), bắt buộc thêm một mục có tiêu đề là `## Đánh giá & Lời khuyên Thực tiễn`. Trong phần này, hãy phân tích khách quan từ góc nhìn của một kỹ sư cấp cao về: Ưu điểm, Nhược điểm, Phạm vi ứng dụng tối ưu (Use-cases) của công nghệ/giải pháp được nhắc đến trong bài viết, và các lưu ý kỹ thuật/rủi ro cần đề phòng khi triển khai nó trên môi trường Production thực tế.
        4. TỐI ƯU HÓA MẬT ĐỘ TỪ KHÓA (Keyword Density): Xác định từ khóa chính từ tiêu đề bài viết (ví dụ: tên công cụ, công nghệ, giải pháp). Hãy lặp lại từ khóa chính này và các biến thể đồng nghĩa tự nhiên của nó với mật độ hợp lý (khoảng 1.5% đến 2.5% tổng số từ), phân bố đều ở đoạn mở bài (trong 100 từ đầu tiên), tiêu đề con (H2, H3), và đoạn kết bài.
        5. TỰ ĐỘNG CHÈN LIÊN KẾT NỘI BỘ (Internal Links) - QUAN TRỌNG: Xem kỹ danh sách các bài viết liên quan có sẵn ở trên và chèn CÀNG NHIỀU liên kết nội bộ phù hợp CÀNG TỐT để tăng liên kết chéo giữa các bài trên hidev.dev (rất tốt cho SEO và giữ chân người đọc).
           - SỐ LƯỢNG: Hãy cố gắng chèn TỐI THIỂU 3 đến 6 liên kết nội bộ (hoặc nhiều hơn nếu danh sách có nhiều bài thực sự liên quan). Chỉ chèn ít hơn khi danh sách phía trên thực sự không có đủ bài phù hợp.
           - TỰ NHIÊN & PHÙ HỢP: Mỗi liên kết phải được lồng ghép MỘT CÁCH TỰ NHIÊN vào giữa câu văn, gắn với một cụm từ/ngữ cảnh có ý nghĩa liên quan trực tiếp đến bài được link tới (anchor text phải mô tả đúng nội dung bài đích), TUYỆT ĐỐI không liệt kê link thành một danh sách khô khan ở cuối bài, không viết kiểu "xem thêm tại đây".
           - Phân bổ các liên kết RẢI RÁC đều khắp thân bài (mở bài, các mục H2/H3 ở giữa, và phần cuối) thay vì dồn vào một chỗ.
           - BẮT BUỘC: Tuyệt đối KHÔNG ĐƯỢC chèn gượng ép các bài viết không liên quan (ví dụ: không cố tình bắc cầu để chèn link bài AI/Game vào bài viết về DevOps/Terraform nếu chúng không thực sự bổ trợ cho nhau). Ưu tiên các bài cùng công nghệ/ngôn ngữ/chủ đề hoặc bổ trợ trực tiếp cho kiến thức đang viết. Mỗi liên kết chèn phải có định dạng Markdown `[Văn cảnh tự nhiên mô tả đúng bài đích](/posts/slug-tuong-ung)` và chỉ dùng đúng slug có trong danh sách (không tự bịa slug).
        6. TỐI ƯU HÓA HÌNH ẢNH & SƠ ĐỒ TRỰC QUAN:
           - BẮT BUỘC: Nếu ở trên có cung cấp "Danh sách các HÌNH ẢNH MINH HỌA THẬT", hãy chèn các ảnh đó vào nội dung bài viết bằng cú pháp Markdown `![mô tả bằng tiếng Việt](URL_ảnh_chính_xác)`. Phải giữ nguyên chính xác 100% chuỗi URL của ảnh (không tự bịa, không rút gọn, không đổi tên miền). Hãy phân bổ các ảnh nằm rải rác một cách hợp lý ngay bên dưới đoạn văn hoặc tiêu đề có nội dung liên quan trực tiếp đến ảnh (KHÔNG dồn tất cả ảnh vào một chỗ, KHÔNG đặt ảnh ngay đầu bài vì đã có ảnh bìa/thumbnail riêng). Ưu tiên chèn từ 2 đến 5 ảnh phù hợp nhất để bài viết trực quan và sinh động, thu hút người đọc. Với mỗi ảnh, hãy viết lại phần mô tả (alt text) bằng tiếng Việt sao cho khớp với ngữ cảnh đoạn văn.
           - Giữ lại tất cả các hình ảnh gốc khác từ nội dung gốc (các thẻ <img> nếu có), chuyển đổi chúng thành cú pháp Markdown hình ảnh dạng ![mô tả](đường_dẫn_ảnh).
           - Nếu KHÔNG có ảnh minh họa nào cho một quy trình công nghệ, bạn hãy tự thiết lập một sơ đồ quy trình dạng sơ đồ khối ký tự (ASCII Art) đơn giản, chuyên nghiệp (ví dụ: `[Thành phần A] ---> [Thành phần B] ---> [Thành phần C]`) ở phần nội dung tương ứng để tăng trải nghiệm trực quan (UX). TUYỆT ĐỐI không dùng emoji/icon trong sơ đồ.
        7. BẮT BUỘC thực hiện các định dạng Markdown nâng cao sau ở đầu nội dung bài viết ("content"):
           - Dòng đầu tiên: Chèn một dòng dẫn nguồn in nghiêng dạng: `> *Bài viết được dịch và tổng hợp từ tin tức gốc. Bạn có thể đọc bài viết gốc bằng tiếng Anh tại [đây]({original_link}).*`
           - Dòng tiếp theo: Tạo một hộp điểm tin nhanh (TL;DR / Quick Highlights) sử dụng blockquote Markdown (ví dụ: `> **Điểm tin nhanh:** \n> - Luận điểm chính 1...\n> - Luận điểm chính 2...`) để người đọc nắm bắt được ngay 3 ý cốt lõi.
        8. BẮT BUỘC: Nếu trong nội dung bài viết gốc xuất hiện nhiều số liệu, phần trăm, thống kê hoặc dữ liệu so sánh trước/sau (ví dụ: tỷ lệ tăng hiệu suất, số lượng phòng ban, kết quả khảo sát...), bạn phải chuyển đổi các số liệu này và trình bày dưới dạng một BẢNG MARKDOWN (Markdown Table) trực quan thay vì chỉ dùng danh sách gạch đầu dòng thông thường. Điều này giúp bài viết trông khoa học và dễ theo dõi hơn.
        9. Viết một tiêu đề tiếng Việt hấp dẫn, kích thích lượt đọc (tối đa 255 ký tự).
        10. Viết một tóm tắt ngắn gọn bằng tiếng Việt mô tả nội dung chính (tối đa 500 ký tự).
        11. Phân loại bài viết vào một trong các danh mục sau (hãy chọn ID danh mục phù hợp nhất dựa trên nội dung):
{categories_list_str}
        12. MỞ BÀI CUỐN HÚT (Hook): Ngay sau hộp Điểm tin nhanh, đoạn mở bài (2-4 câu đầu) phải là một cái "móc câu" thật cuốn hút — nêu bật được vấn đề/nỗi đau của lập trình viên, một con số gây sốc, hoặc một tuyên bố mạnh mẽ về tầm quan trọng của chủ đề — để kích thích người đọc đọc tiếp. TUYỆT ĐỐI không mở bài nhạt nhẽo kiểu "Trong bài viết này chúng ta sẽ tìm hiểu...".
        13. TĂNG ĐỘ UY TÍN & TIN CẬY (E-E-A-T): Viết với giọng văn của một chuyên gia thực thụ, tự tin và có chính kiến. Khi trích dẫn số liệu, phiên bản, tên công ty/sản phẩm, ngày tháng — phải bám sát và chính xác tuyệt đối theo nội dung gốc, TUYỆT ĐỐI KHÔNG được bịa đặt thông tin, số liệu hay tính năng không có thật. Nếu nội dung gốc không đề cập, đừng phỏng đoán như thể là sự thật. Ưu tiên dẫn nguồn/tham chiếu tới trang chính thức khi phù hợp để tăng độ tin cậy.
        14. ĐỊNH DẠNG DỄ ĐỌC & NỔI BẬT: In đậm (**bold**) các thuật ngữ, tên công cụ, và ý tưởng cốt lõi quan trọng để người đọc lướt nhanh vẫn nắm được ý chính. Sử dụng các hộp callout blockquote để nhấn mạnh mẹo hay và cảnh báo, ví dụ: `> **Mẹo hay:** ...` cho lời khuyên hữu ích và `> **Lưu ý:** ...` cho cảnh báo/rủi ro. TUYỆT ĐỐI KHÔNG dùng bất kỳ emoji hay icon nào trong toàn bộ bài viết (không dùng trong tiêu đề H2/H3, không dùng trong callout, không dùng trong nội dung) — giữ văn phong chuyên nghiệp, chuẩn mực, nghiêm túc.
        15. BẮT BUỘC THÊM MỤC HỎI - ĐÁP (FAQ): Gần cuối bài viết (sau mục Đánh giá & Lời khuyên Thực tiễn), thêm một mục `## Câu hỏi thường gặp (FAQ)` gồm 3-4 câu hỏi mà lập trình viên/người đọc thực sự hay thắc mắc về chủ đề này, mỗi câu hỏi là một tiêu đề `### ` và câu trả lời ngắn gọn, đúng trọng tâm bên dưới. Điều này vừa tăng giá trị cho người đọc vừa tối ưu SEO (rich snippet).
        16. KẾT BÀI & CTA: Kết thúc bằng một mục `## Kết luận` súc tích, chốt lại giá trị cốt lõi và đưa ra một lời kêu gọi hành động (CTA) tự nhiên, khuyến khích người đọc dùng thử công cụ/công nghệ, để lại bình luận thảo luận, hoặc theo dõi hi_dev để cập nhật tin công nghệ mới nhất.
        17. ĐỘ DÀI & GIÁ TRỊ: Bài viết phải đủ dài và chuyên sâu (tối thiểu ~800-1200 từ nếu nội dung gốc cho phép) nhưng mỗi câu đều phải có giá trị — TUYỆT ĐỐI không viết lan man, sáo rỗng hay lặp lại ý để câu chữ. Chất lượng và mật độ thông tin là trên hết.
        Bạn BẮT BUỘC phải trả về kết quả dưới định dạng JSON với cấu trúc chính xác sau:
        {{
          "title": "Tiêu đề tiếng Việt",
          "summary": "Tóm tắt tiếng Việt ngắn gọn",
          "content": "Nội dung bài viết bằng tiếng Việt định dạng Markdown (.md) cực kỳ chi tiết và chuẩn chỉnh, KHÔNG dùng bất kỳ emoji/icon nào, theo đúng thứ tự: (1) dòng dẫn nguồn in nghiêng, (2) hộp Điểm tin nhanh TL;DR, (3) đoạn mở bài hook cuốn hút, (4) thân bài chuyên sâu chia H2/H3/H4 với chữ in đậm các ý chính, hình ảnh minh họa thật rải rác, callout Mẹo/Lưu ý (không emoji), bảng số liệu Markdown, sơ đồ ASCII khi cần và NHIỀU liên kết nội bộ (tối thiểu 3-6) được lồng ghép tự nhiên rải rác khắp bài, (5) mục Đánh giá & Lời khuyên Thực tiễn, (6) mục Câu hỏi thường gặp (FAQ), (7) mục Kết luận kèm CTA",
          "categoryId": 1,
          "thumbnail": "Đường dẫn ảnh Thumbnail nổi bật. BẮT BUỘC: Nếu thông số 'Ảnh Thumbnail thu thập được' phía trên có giá trị, hãy lấy đúng giá trị đó. Nếu không (None), hãy tự động đề xuất một liên kết ảnh công nghệ/AI/game chất lượng cao liên quan trực tiếp từ Unsplash để làm ảnh bìa nổi bật (ví dụ: https://images.unsplash.com/photo-...) hoặc để null"
        }}
        
        Lưu ý: Không bọc JSON trong các thẻ markdown ```json và ```, chỉ trả về chuỗi JSON thuần tuý.
        """
        
        # Enforce JSON output format using our new key-rotating caller with maximum tokens and low temperature for accuracy
        response = call_gemini_with_rotation(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.4,
                "max_output_tokens": 8192
            },
            model_name=model_name
        )
        
        if not response.text:
            logger.error("Empty response received from Gemini API.")
            return None
            
        raw_text = response.text.strip()
        start_idx = raw_text.find('{')
        if start_idx == -1:
            logger.error(f"No JSON object found in response. Raw output was: {raw_text}")
            return None
            
        decoder = json.JSONDecoder()
        data, _ = decoder.raw_decode(raw_text[start_idx:])
        
        # Fallback category ID if invalid categoryId returned
        if 'categoryId' not in data or data['categoryId'] not in valid_cat_ids:
            data['categoryId'] = default_cat_id
            
        # Strip code block decorators if Gemini still included them
        if data.get('content'):
            # In case Gemini generates code blocks around the markdown itself
            content = data['content']
            if content.startswith("```markdown\n") and content.endswith("\n```"):
                data['content'] = content[12:-4]
            elif content.startswith("```md\n") and content.endswith("\n```"):
                data['content'] = content[5:-4]
                
        return data
        
    except json.JSONDecodeError as je:
        logger.error(f"Failed to parse JSON response from Gemini API: {je}. Raw output was: {response.text if 'response' in locals() else 'None'}")
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
    return None

# Authenticate with Next.js web application
def login_and_get_session(site_url, username, password):
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'hi-dev-rss-crawler/1.0'
    })
    
    # 1. Perform GET request to /login to fetch CSRF token cookie from Next.js proxy
    base_url = site_url.rstrip('/')
    try:
        logger.info(f"Fetching CSRF token from {base_url}/login")
        session.get(f"{base_url}/login", timeout=10)
    except Exception as e:
        logger.error(f"Failed to fetch initial CSRF cookie: {e}")
        return None
        
    csrf_token = session.cookies.get('csrf_token')
    if not csrf_token:
        logger.error("No csrf_token cookie returned by server.")
        return None
        
    logger.info(f"CSRF token obtained: {csrf_token[:8]}...")
    
    # 2. Perform POST request with X-CSRF-Token header
    login_url = f"{base_url}/api/auth/login"
    logger.info(f"Authenticating with {login_url} (User: {username})")
    
    headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf_token
    }
    
    payload = {
        "username": username,
        "password": password
    }
    
    try:
        res = session.post(login_url, json=payload, headers=headers, timeout=10)
        if res.status_code == 200:
            res_data = res.json()
            if res_data.get('success'):
                logger.info("Login successful. Authentication session active.")
                return session
            else:
                logger.error(f"Login failed: {res_data.get('error', 'Unknown error')}")
        else:
            logger.error(f"Login request failed. Status code: {res.status_code}, Response: {res.text}")
    except Exception as e:
        logger.error(f"Exception during login: {e}")
        
    return None

# Post the rewritten article to the Next.js API
def post_article(session, site_url, article_data, original_link):
    post_url = f"{site_url.rstrip('/')}/api/posts"
    logger.info(f"Posting article to {post_url}: '{article_data['title']}'")
    
    csrf_token = session.cookies.get('csrf_token')
    headers = {
        'X-CSRF-Token': csrf_token
    }
    
    # Use thumbnail from Gemini data if present, otherwise fallback to None
    payload = {
        "title": article_data['title'],
        "summary": article_data['summary'],
        "link": original_link,
        "content": article_data['content'],
        "categoryId": int(article_data['categoryId']),
        "thumbnail": article_data.get('thumbnail') or None
    }
    
    try:
        res = session.post(post_url, json=payload, headers=headers, timeout=15)
        if res.status_code == 200:
            res_data = res.json()
            if res_data.get('success'):
                logger.info(f"Article posted successfully! Slug: {res_data.get('slug')}")
                return True
            else:
                logger.error(f"Post API returned error: {res_data.get('error', 'Unknown error')}")
        else:
            logger.error(f"Failed to post article. Status code: {res.status_code}, Response: {res.text}")
    except Exception as e:
        logger.error(f"Exception during article submission: {e}")
        
    return False

# Main iteration process
def run_crawler_cycle():
    logger.info("Starting crawler cycle...")
    
    # Reload environment in case .env was edited
    load_env()
    
    # Check Gemini API Key
    if not os.environ.get("GEMINI_API_KEY"):
        logger.error("GEMINI_API_KEY is not defined in .env. Skipping cycle.")
        return
        
    db_config = get_db_config()
    if not db_config:
        logger.warning("No MySQL database configuration found in environment. Using local file tracker only.")
        
    db_categories = get_all_categories(db_config)
        
    # Get Site URL, try connecting. Fallback from production domain to local development port if offline
    site_url = os.environ.get('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    logger.info(f"Target site URL: {site_url}")
    
    # Attempt to log in
    username = "admin"
    password = "admin123"
    
    session = login_and_get_session(site_url, username, password)
    
    # If production URL fails or is not reachable (e.g. if configured as production in .env but developer runs locally)
    if not session and site_url != 'http://localhost:3000':
        logger.warning(f"Failed to log in to site_url: {site_url}. Trying local fallback http://localhost:3000...")
        site_url = 'http://localhost:3000'
        session = login_and_get_session(site_url, username, password)
        
    if not session:
        logger.error("Unable to authenticate with Next.js web application. Skipping cycle.")
        return
        
    # Crawl each feed
    for feed_info in FEEDS:
        feed_name = feed_info['name']
        feed_url = feed_info['url']
        default_cat_slug = feed_info.get('default_category_slug', 'developer-tools')
        
        # Resolve ID from slug dynamically
        default_cat_id = 1
        for cat in db_categories:
            if cat.get('slug') == default_cat_slug:
                default_cat_id = cat['id']
                break
                
        # Fetch candidate posts for internal linking prioritizing this category
        recent_posts = get_recent_posts(db_config, category_id=default_cat_id, limit=150)
        
        logger.info(f"Processing feed [{feed_name}]...")
        entries = fetch_rss_entries(feed_url)
        
        if not entries:
            logger.warning(f"No entries found or failed to parse feed: {feed_name}")
            continue
            
        logger.info(f"Found {len(entries)} articles in [{feed_name}]. Checking for updates...")
        
        new_posts_count = 0
        for entry in entries:
            # Optimize API credits: process maximum 3 new articles per feed per cycle
            if new_posts_count >= 3:
                logger.info(f"Reached maximum limit of 3 new posts for feed [{feed_name}] in this cycle. Skipping remaining entries to optimize API credits.")
                break
                
            link = entry['link']
            title = entry['title']
            desc = entry['description']
            
            # Check duplicate
            if check_duplicate(link, db_config):
                # Skip duplicate
                continue
                
            logger.info(f"New article detected: '{title}' -> Link: {link}")
            
            # Scrape full article text, og:image thumbnail, and illustrative images
            full_text, scraped_thumbnail, article_images = fetch_full_article(link)
            content_to_rewrite = full_text if full_text else desc

            # Rewrite with Gemini (pass scraped_thumbnail, article_images, recent_posts, and db_categories)
            rewritten = rewrite_with_gemini(title, link, content_to_rewrite, default_cat_id, scraped_thumbnail, recent_posts, db_categories, article_images)
            if not rewritten:
                logger.warning(f"Failed to rewrite article: '{title}'. Skipping.")
                continue
                
            # Submit to website
            success = post_article(session, site_url, rewritten, link)
            if success:
                # Add to duplicates trackers
                save_posted_link(link)
                new_posts_count += 1
                # Sleep briefly to avoid hitting rate limits or overwhelming the server/database
                time.sleep(3)
            else:
                logger.error(f"Failed to publish article: '{title}' to {site_url}")
                
        logger.info(f"Completed feed [{feed_name}]. Published {new_posts_count} new posts.")

def main():
    logger.info("Initializing hi_dev. RSS Autoposting Daemon...")
    load_env()
    
    # Run first cycle immediately
    try:
        run_crawler_cycle()
    except KeyboardInterrupt:
        logger.info("Daemon terminated by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unhandled exception in initial run: {e}")
        
    # Start periodic daemon loop
    interval_seconds = 300 # 5 minutes
    logger.info(f"Daemon scheduled to run every {interval_seconds} seconds (5 minutes). Press Ctrl+C to stop.")
    
    while True:
        try:
            time.sleep(interval_seconds)
            run_crawler_cycle()
        except KeyboardInterrupt:
            logger.info("Daemon terminated by user.")
            break
        except Exception as e:
            logger.error(f"Unhandled exception in daemon loop: {e}")

if __name__ == '__main__':
    main()
