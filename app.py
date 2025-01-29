import os
import re
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from ultralytics import YOLO
import pandas as pd
from flask_cors import CORS
from googletrans import Translator
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Path to the directory where images are stored
IMAGE_FOLDER = "D:\\nn\\Food Images"  # Your path to images folder
UPLOAD_FOLDER = "D:\\nn\\uploads"  # Folder to save uploaded images
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Load the recipe datasets
recipe_file_path = "D:\\nn\\Food Ingredients and Recipe Dataset with Image Name Mapping.csv"
seasonal_recipe_file_path = "D:\\nn\\seasonaldatabase.csv"
recipes = pd.read_csv(recipe_file_path)
seasonal_recipes_df = pd.read_csv(seasonal_recipe_file_path)  # Renamed to avoid conflict
recipes.columns = recipes.columns.str.strip().str.lower()  # Normalize column names
seasonal_recipes_df.columns = seasonal_recipes_df.columns.str.strip().str.lower()  # Normalize column names

# Load the YOLO model
model = YOLO("D:\\nn\\tommm.pt")  # Replace with the path to your YOLO model

# Initialize the translator
translator = Translator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    print(f"File saved to {file_path}")  # Debugging log

    try:
        # Perform detection using YOLO model
        results = model(file_path)
        print(f"YOLO results: {results}")  # Debugging log

        detected_ingredients = []
        for result in results:
            for cls in result.boxes.cls:
                class_index = int(cls)
                detected_ingredients.append(result.names[class_index])

        return jsonify({'ingredients': detected_ingredients})
    except Exception as e:
        print(f"Error during YOLO detection: {e}")
        return jsonify({'error': 'Failed to process image'}), 500

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    ingredients = data.get('ingredients', '').split(', ')
    ingredients = [ingredient.strip().lower() for ingredient in ingredients]

    # Function to clean and normalize ingredients
    def clean_ingredients(ingredient_list):
        return [ingredient.strip().lower() for ingredient in ingredient_list]

    # Calculate similarity score based on the number of matching ingredients
    def calculate_similarity(recipe_ingredients):
        recipe_ingredients = clean_ingredients(recipe_ingredients.lower().split(', '))
        common_ingredients = set(ingredients) & set(recipe_ingredients)
        return len(common_ingredients) / len(set(ingredients) | set(recipe_ingredients))

    recipes['similarity_score'] = recipes['ingredients'].apply(calculate_similarity)

    # Sort recipes by similarity score in descending order and get the top 5 recipes
    top_recipes = recipes.sort_values(by='similarity_score', ascending=False).head(5)

    # Convert top recipes to a list of dictionaries
    recipe_list = top_recipes.to_dict(orient='records')

    return jsonify(recipe_list)

@app.route('/details', methods=['POST'])
def details():
    recipe_title = request.json['title']
    recipe = recipes.loc[recipes['title'] == recipe_title].iloc[0]
    
    title = recipe.get('title', 'Title not available.')
    ingredients = recipe.get('ingredients', 'Ingredients not available.')
    instructions = recipe.get('instructions', 'Instructions not available.')
    calories = recipe.get('calories', 'Calories information not available.')
    image_name = recipe.get('image_name', '')

    if instructions != 'Instructions not available.':
        steps = re.split(r'(?<=[.!?])\s+', instructions)
        steps = [step.strip() for step in steps if step.strip()]
    else:
        steps = ['Instructions not available.']
    
    return jsonify({
        'title': title,
        'ingredients': ingredients,
        'steps': steps,
        'calories': calories,
        'image_name': image_name
    })

@app.route('/translate', methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get('text', '')
    target_language = data.get('target_language', 'en')

    try:
        translation = translator.translate(text, dest=target_language)
        return jsonify({'translated_text': translation.text})
    except Exception as e:
        print(f"Error during translation: {e}")
        return jsonify({'error': 'Failed to translate text'}), 500

@app.route('/seasonal_recipes', methods=['GET'])
def get_seasonal_recipes():
    current_season = request.args.get('season')
    if not current_season:
        print("No season provided")
        return jsonify([])

    print(f"Requested season: {current_season}")

    # Convert the season column to lowercase for comparison
    seasonal_recipes_df['season'] = seasonal_recipes_df['season'].str.lower()

    # Filter recipes by the current season
    filtered_recipes = seasonal_recipes_df[seasonal_recipes_df['season'] == current_season.lower()]

    print(f"Filtered recipes: {filtered_recipes}")

    if filtered_recipes.empty:
        print("No seasonal recipes found")
        return jsonify([])

    # Convert filtered recipes to a list of dictionaries
    recipe_list = filtered_recipes.to_dict(orient='records')

    print(f"Returning recipes: {recipe_list}")

    return jsonify(recipe_list)

@app.route('/random_seasonal_recipe', methods=['GET'])
def random_seasonal_recipe():
    # Select a random recipe from the seasonal recipes
    random_recipe = seasonal_recipes_df.sample(n=1).iloc[0]
    
    return jsonify({
        'title': random_recipe['name'],
        'instructions': random_recipe['instructions']
    })

@app.route('/random_recipes', methods=['GET'])
def random_recipes():
    random_recipe = recipes.sample(n=1).to_dict(orient='records')[0]
    return jsonify(random_recipe)

@app.route('/image/<filename>')
def get_image(filename):
    return send_from_directory(IMAGE_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)