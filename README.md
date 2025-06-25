## Introduction

Full-stack movie and series streaming application, built from the ground up to mimic the core functionalities of major platforms like Netflix. It serves as a practical, real-world example of integrating a React Native frontend with a modern Backend-as-a-Service (BaaS) and a dedicated video streaming provider. The project demonstrates a wide range of skills, including user authentication, database management, secure API interactions, state management with React Context, and handling complex media workflows. Whether you are a developer looking to learn, a recruiter evaluating skills, or simply curious, this document provides all the information needed to understand, set up, and run the application.

### TechStack

-React native
-Expo
-NativewInd
-Appwrite
-Mux

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo Go app on your mobile device (or a configured Android/iOS emulator)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add the following keys. You will get these values from your Appwrite and Mux accounts.

    ```env
    # Appwrite Project Details
    EXPO_PUBLIC_APPWRITE_PROJECT_ID=YOUR_APPWRITE_PROJECT_ID
    EXPO_PUBLIC_APPWRITE_DATABASE_ID=YOUR_APPWRITE_DATABASE_ID

    # Appwrite Collection IDs
    EXPO_PUBLIC_APPWRITE_COLLECTION_ID=YOUR_METRICS_COLLECTION_ID
    EXPO_PUBLIC_APPWRITE_MOVIES_COLLECTION_ID=YOUR_MOVIES_COLLECTION_ID
    ```

4.  **Run the application:**
    Start the Expo development server. It's recommended to clear the cache on the first run.
    ```bash
    npx expo start -c
    ```
    Scan the QR code with the Expo Go app on your phone.

---

## ☁️ Backend Configuration (Appwrite)

This project will not run without a properly configured Appwrite project.

1.  **Create an Appwrite Project**:
    - Go to [Appwrite Cloud](https://cloud.appwrite.io) and create a new project.
    - Your **Project ID** goes into the `.env` file.

2.  **Enable Authentication**:
    - Navigate to **Auth** -> **Settings**.
    - Enable the **Email/Password** provider.

3.  **Create the Database**:
    - Navigate to **Databases** and create a new database.
    - Your **Database ID** goes into the `.env` file.

4.  **Create the `movies` Collection**:
    - **Collection ID**: Add this to your `.env` file.
    - **Attributes**:
      - `title` (string, required)
      - `overview` (string, required)
      - `posterUrl` (string, required)
      - `releaseYear` (integer, required)
      - `rating` (float, required)
      - `type` (enum: `movie`, `series`, required)
      - `streamUrl` (string, required)
      - `episodeUrls` (string, **array**)
    - **Settings -> Permissions**: Add a role for `Any` with **Read** access.
    - **Settings -> Attributes**: For **each** attribute, add a **Read Access** role for `Any`.
    - **Indexes**: Create an index on the `title` attribute to enable searching.

5.  **Create the `metrics` Collection**:
    - **Collection ID**: Add this to your `.env` file.
    - **Attributes**:
      - `searchTerm` (string, required)
      - `count` (integer, required)
      - `poster_url` (string, required)
      - `movie_id` (string, required)
      - `title` (string, required)
    - **Settings -> Permissions**: Add a role for `Users` with **Create** and **Read** access.

## 📹 Video Streaming Configuration (Mux)

1.  **Sign up for Mux**.
2.  **Upload Video Assets**: Upload your movie trailers and series episodes to Mux.
3.  **Get Playback IDs**: For each asset, Mux will provide a Playback ID.
4.  **Construct URLs**: The streaming URL is `https://stream.mux.com/YOUR_PLAYBACK_ID.m3u8`.
5.  **Add URLs to Appwrite**: In your `movies` collection, edit a document and add the Mux URLs to the `episodeUrls` array field.

This project was developed by [Javkhlan](https://github.com/Skitarii11) as a Personal project