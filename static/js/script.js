document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submit-button');
    const recommendationsContainer = document.getElementById('recommendations-container');
    const translateButton = document.getElementById('translate-button');
    const targetLanguageSelect = document.getElementById('target-language-select');
    const generateSeasonalRecipesButton = document.getElementById('generate-seasonal-recipes-button');
    const seasonalRecipesContainer = document.getElementById('seasonal-recipes-container');
    const generateRandomRecipesButton = document.getElementById('generate-random-recipes-button');
    const randomRecipesContainer = document.getElementById('random-recipes-container');
    const openCameraButton = document.getElementById('open-camera-button');
    const captureButton = document.getElementById('capture-button');
    const cameraFeed = document.getElementById('camera-feed');
    const canvas = document.getElementById('canvas');

    submitButton.addEventListener('click', async () => {
        const ingredients = document.getElementById('ingredient-input').value;

        if (!ingredients.trim()) {
            alert("Please enter some ingredients.");
            return;
        }

        recommendationsContainer.innerHTML = '<div>Loading recommendations...</div>';

        try {
            const response = await fetch('/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recommendations');
            }

            const recipes = await response.json();
            recommendationsContainer.innerHTML = '';

            if (!recipes || recipes.length === 0 || recipes.message) {
                recommendationsContainer.innerHTML = '<div>No recipes found for the given ingredients.</div>';
                return;
            }

            renderRecommendations(recipes, recommendationsContainer);
        } catch (error) {
            console.error('An error occurred while fetching recommendations:', error);
            recommendationsContainer.innerHTML = '<div>An error occurred while fetching recommendations.</div>';
        }
    });

    function renderRecommendations(recipes, container) {
        container.innerHTML = ''; // Clear existing recommendations
        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.classList.add('recommendation-item');
            div.dataset.title = recipe.title;
            div.textContent = `${recipe.title} (Score: ${recipe.similarity_score.toFixed(2)})`;
            container.appendChild(div);

            // Update image
            const imgElement = document.getElementById('recipe-image');
            imgElement.src = `/image/${recipe.image_name}`;
            imgElement.style.display = 'block';
        });
    }

    recommendationsContainer.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('recommendation-item')) {
            console.log(`Fetching details for: ${target.dataset.title}`);
            try {
                const detailsResponse = await fetch('/details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: target.dataset.title })
                });

                if (!detailsResponse.ok) {
                    throw new Error('Failed to fetch recipe details');
                }

                const details = await detailsResponse.json();
                console.log('Recipe details:', details);

                // Update title
                const titleElement = document.getElementById('recipe-title');
                titleElement.textContent = details.title;

                // Update image
                const imgElement = document.getElementById('recipe-image');
                imgElement.src = `/image/${details.image_name}`;
                imgElement.style.display = 'block';

                // Update ingredients
                const ingredientsElement = document.getElementById('recipe-ingredients');
                ingredientsElement.textContent = `Ingredients: ${details.ingredients}`;

                // Format instructions without step numbers
                const instructionsList = document.getElementById('instructions');
                instructionsList.innerHTML = ''; // Clear existing instructions

                if (details.steps && details.steps.length > 0) {
                    details.steps.forEach(step => {
                        const li = document.createElement('li');
                        li.textContent = step;
                        instructionsList.appendChild(li);
                    });
                } else {
                    instructionsList.innerHTML = '<li>Instructions not available.</li>';
                }

                // Update calories
                const caloriesElement = document.getElementById('calories');
                caloriesElement.textContent = `Calories: ${details.calories || 'Not available'}`;
            } catch (error) {
                console.error(error);
                alert("An error occurred while fetching recipe details.");
            }
        }
    });

    translateButton.addEventListener('click', async () => {
        const targetLanguage = targetLanguageSelect.value;
        const textToTranslate = document.getElementById('recipe-ingredients').textContent + '\n' +
                                Array.from(document.getElementById('instructions').children).map(li => li.textContent).join('\n') + '\n' +
                                document.getElementById('calories').textContent;

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToTranslate, target_language: targetLanguage })
            });

            if (!response.ok) {
                throw new Error('Failed to translate text');
            }

            const data = await response.json();
            const translatedText = data.translated_text.split('\n');
            document.getElementById('recipe-ingredients').textContent = translatedText[0];
            document.getElementById('instructions').innerHTML = translatedText.slice(1, -1).map(step => `<li>${step}</li>`).join('');
            document.getElementById('calories').textContent = translatedText[translatedText.length - 1];
        } catch (error) {
            console.error('Error during translation:', error);
            alert("An error occurred while translating the text.");
        }
    });

    generateSeasonalRecipesButton.addEventListener('click', async () => {
        const seasonalRecipesContainer = document.getElementById('seasonal-recipes-container');
        seasonalRecipesContainer.innerHTML = '<div>Loading seasonal recipe...</div>';

        // Determine the current month and season
        const month = new Date().getMonth() + 1; // getMonth() returns 0-11
        let currentSeason;

        if (month >= 3 && month <= 5) {
            currentSeason = 'spring';
        } else if (month >= 6 && month <= 8) {
            currentSeason = 'summer';
        } else if (month >= 9 && month <= 11) {
            currentSeason = 'fall';
        } else {
            currentSeason = 'winter';
        }

        try {
            const response = await fetch(`/seasonal_recipes?season=${currentSeason}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch seasonal recipe');
            }

            const recipes = await response.json();
            seasonalRecipesContainer.innerHTML = '';

            if (!recipes || recipes.length === 0) {
                seasonalRecipesContainer.innerHTML = '<div>No seasonal recipe found.</div>';
                return;
            }

            // Select a random recipe from the filtered seasonal recipes
            const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];

            seasonalRecipesContainer.innerHTML = `
                <h3>${randomRecipe.name}</h3>
                <p>${randomRecipe.instructions}</p>
            `;
        } catch (error) {
            console.error('Error fetching seasonal recipe:', error);
            seasonalRecipesContainer.innerHTML = '<div>An error occurred while fetching seasonal recipe.</div>';
        }
    });

    document.getElementById('generate-random-recipes-button').addEventListener('click', async () => {
        const randomRecipesContainer = document.getElementById('random-recipes-container');
        randomRecipesContainer.innerHTML = '<div>Loading random recipe...</div>';

        try {
            const response = await fetch('/random_recipes', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch random recipe');
            }

            const recipe = await response.json();
            randomRecipesContainer.innerHTML = '';

            if (!recipe || recipe.message) {
                randomRecipesContainer.innerHTML = '<div>No random recipe found.</div>';
                return;
            }

            // Format instructions into steps
            const instructionsSteps = recipe.instructions.split('.').map(step => step.trim()).filter(Boolean);

            randomRecipesContainer.innerHTML = `
                <h3>${recipe.title}</h3>
                <ol>${instructionsSteps.map(step => `<li>${step}</li>`).join('')}</ol>
            `;
        } catch (error) {
            console.error('Error fetching random recipe:', error);
            randomRecipesContainer.innerHTML = '<div>An error occurred while fetching random recipe.</div>';
        }
    });

    openCameraButton.addEventListener('click', () => {
        // Show the video and capture button
        cameraFeed.style.display = 'block';
        captureButton.style.display = 'inline-block';

        startCamera();
    });

    // Function to start camera and display live feed in video element
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraFeed.srcObject = stream;
        } catch (error) {
            console.error('Error accessing camera: ', error);
            alert("Unable to access camera. Please check your permissions.");
        }
    }

    // Capture image from camera feed when the "Capture Image" button is clicked
    captureButton.addEventListener('click', async () => {
        const context = canvas.getContext('2d');

        // Set canvas size to match video dimensions
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png');
        
        console.log('Captured image data:', imageDataUrl); // Debugging log

        // Display loading indicator while waiting for detection results
        const recommendationsList = document.getElementById('recommendations-list');
        if (recommendationsList) {
            recommendationsList.innerHTML = '<li>Detecting ingredients... Please wait.</li>';
        }

        // Convert DataURI to Blob with a filename
        const blob = dataURItoBlob(imageDataUrl);
        const formData = new FormData();
        formData.append('image', blob, 'captured_image.png'); // Add a filename with extension

        try {
            // Send the image to Flask for YOLO detection
            const response = await fetch('/upload_image', {  // Ensure this matches your Flask endpoint
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process image');
            }

            const data = await response.json();

            if (data.ingredients) {
                // Count the occurrences of each ingredient
                const ingredientCounts = data.ingredients.reduce((counts, ingredient) => {
                    counts[ingredient] = (counts[ingredient] || 0) + 1;
                    return counts;
                }, {});

                // Populate ingredients input with detected ingredients
                const ingredientInput = document.getElementById('ingredient-input');
                ingredientInput.value = Object.entries(ingredientCounts)
                    .map(([ingredient, count]) => `${count} ${ingredient}${count > 1 ? 's' : ''}`)
                    .join(', ');

                // Display detected ingredients below the input field
                const detectedIngredientsList = document.getElementById('detected-ingredients-list');
                detectedIngredientsList.innerHTML = ''; // Clear existing ingredients
                Object.entries(ingredientCounts).forEach(([ingredient, count]) => {
                    const li = document.createElement('li');
                    li.textContent = `${count} ${ingredient}${count > 1 ? 's' : ''}`;
                    detectedIngredientsList.appendChild(li);
                });

                // Display detected ingredients in recommendations list
                if (recommendationsList) {
                    recommendationsList.innerHTML = '';
                    data.ingredients.forEach((ingredient) => {
                        const li = document.createElement('li');
                        li.textContent = ingredient;
                        recommendationsList.appendChild(li);
                    });
                }
            } else {
                if (recommendationsList) {
                    recommendationsList.innerHTML = '<li>No ingredients detected.</li>';
                }
            }
            
        } catch (error) {
            console.error('Error during detection:', error);
            if (recommendationsList) {
                recommendationsList.innerHTML = '<li>Error detecting ingredients. Please try again.</li>';
            }
            
        } finally {
            // Stop camera feed after capturing an image
            const stream = cameraFeed.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            cameraFeed.srcObject = null;
        }
    });

    // Function to convert DataURI to Blob
    function dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(',')[1]);
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    }
});