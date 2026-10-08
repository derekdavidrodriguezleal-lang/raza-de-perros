const BREEDS_URL = "https://dog.ceo/api/breeds/list/all";
const BREED_IMAGE_URL = "https://dog.ceo/api/breed";

const form = document.querySelector("#breed-form");
const breedInput = document.querySelector("#breed-input");
const breedOptions = document.querySelector("#breed-options");
const searchButton = document.querySelector("#search-button");
const breedError = document.querySelector("#breed-error");
const breedCount = document.querySelector("#breed-count");
const statusMessage = document.querySelector("#status-message");
const resultCard = document.querySelector("#result-card");
const resultImage = document.querySelector("#result-image");
const resultName = document.querySelector("#result-name");
const anotherPhotoButton = document.querySelector("#another-photo");

let breeds = new Map();
let selectedBreed = "";
let requestNumber = 0;

function formatBreedName(breed, subBreed = "") {
  return [subBreed, breed].filter(Boolean).join(" ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setStatus(message, state = "loading") {
  statusMessage.replaceChildren();
  statusMessage.dataset.state = state;

  if (state === "loading") {
    const spinner = document.createElement("span");
    spinner.className = "loading-spinner";
    spinner.setAttribute("aria-hidden", "true");
    statusMessage.append(spinner);
  }

  const text = document.createElement("span");
  text.textContent = message;
  statusMessage.append(text);
  statusMessage.hidden = false;
  resultCard.hidden = true;
}

function clearError() {
  breedError.textContent = "";
  breedError.hidden = true;
  breedInput.setAttribute("aria-invalid", "false");
}

function showError(message) {
  breedError.textContent = message;
  breedError.hidden = false;
  breedInput.setAttribute("aria-invalid", "true");
  breedInput.focus();
}

function normalizedBreed(value) {
  return value.trim().toLocaleLowerCase("es");
}

function validateBreed(value) {
  const breedName = normalizedBreed(value);

  if (!breedName) {
    return { error: "Escribe el nombre de una raza para continuar." };
  }

  if (breeds.size === 0) {
    return { error: "La lista de razas no está disponible. Recarga la página e inténtalo de nuevo." };
  }

  const breedPath = breeds.get(breedName);
  if (!breedPath) {
    return { error: "Elige una raza que aparezca en las sugerencias." };
  }

  return { breedPath };
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading || breeds.size === 0;
  anotherPhotoButton.disabled = isLoading;
}

async function loadBreeds() {
  try {
    const response = await fetch(BREEDS_URL);
    if (!response.ok) {
      throw new Error(`La API respondió con el estado ${response.status}.`);
    }

    const data = await response.json();
    if (data.status !== "success" || !data.message || typeof data.message !== "object") {
      throw new Error("La API devolvió una lista de razas no válida.");
    }

    for (const [breed, subBreeds] of Object.entries(data.message)) {
      if (!Array.isArray(subBreeds)) {
        throw new Error("La API devolvió una lista de razas no válida.");
      }

      if (subBreeds.length === 0) {
        breeds.set(normalizedBreed(formatBreedName(breed)), breed);
        continue;
      }

      for (const subBreed of subBreeds) {
        const label = formatBreedName(breed, subBreed);
        breeds.set(normalizedBreed(label), `${breed}/${subBreed}`);
      }
    }

    const options = document.createDocumentFragment();
    for (const label of [...breeds.keys()].sort((first, second) => first.localeCompare(second, "es"))) {
      const option = document.createElement("option");
      option.value = formatBreedNameFromKey(label);
      options.append(option);
    }
    breedOptions.append(options);
    breedCount.textContent = `${breeds.size} razas para explorar`;
    statusMessage.hidden = true;
    searchButton.disabled = false;
  } catch (error) {
    console.error("No se pudieron cargar las razas:", error);
    breedCount.textContent = "No se pudieron cargar las razas";
    setStatus("No pudimos conectar con la API. Comprueba tu conexión y recarga la página.", "error");
  }
}

function formatBreedNameFromKey(key) {
  return key.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function searchBreed(breedPath) {
  const currentRequest = ++requestNumber;
  selectedBreed = breedPath;
  setLoading(true);
  setStatus("Buscando una foto…");

  try {
    const response = await fetch(`${BREED_IMAGE_URL}/${breedPath}/images/random`);
    if (!response.ok) {
      throw new Error(`La API respondió con el estado ${response.status}.`);
    }

    const data = await response.json();
    if (data.status !== "success" || typeof data.message !== "string") {
      throw new Error("La API no devolvió una imagen válida para esta raza.");
    }

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("La imagen de esta raza no está disponible."));
      image.src = data.message;
    });

    if (currentRequest !== requestNumber) {
      return;
    }

    resultImage.src = image.src;
    resultImage.alt = `Perro de raza ${formatBreedNameFromKey(normalizedBreed(breedInput.value))}`;
    resultName.textContent = formatBreedNameFromKey(normalizedBreed(breedInput.value));
    statusMessage.hidden = true;
    resultCard.hidden = false;
  } catch (error) {
    if (currentRequest !== requestNumber) {
      return;
    }

    console.error("No se pudo consultar la raza:", error);
    setStatus("No pudimos obtener una foto. Inténtalo de nuevo en un momento.", "error");
  } finally {
    if (currentRequest === requestNumber) {
      setLoading(false);
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  if (searchButton.disabled && breeds.size > 0) {
    return;
  }

  const validation = validateBreed(breedInput.value);
  if (validation.error) {
    showError(validation.error);
    return;
  }

  searchBreed(validation.breedPath);
});

breedInput.addEventListener("input", () => {
  clearError();
});

breedInput.addEventListener("blur", () => {
  if (!breedInput.value.trim()) {
    return;
  }

  const validation = validateBreed(breedInput.value);
  if (validation.error) {
    showError(validation.error);
  }
});

anotherPhotoButton.addEventListener("click", () => {
  if (selectedBreed) {
    searchBreed(selectedBreed);
  }
});

loadBreeds();
