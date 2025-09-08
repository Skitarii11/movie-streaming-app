import { Client, Databases, ID, Query, Account, Models } from "react-native-appwrite";

// --- CONFIGURATION & CLIENT SETUP ---
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const METRICS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_MOVIES_COLLECTION_ID!;

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);
const account = new Account(client);


// --- TRENDING/METRICS FUNCTIONS ---
export const updateSearchCount = async (query: string, movie: Movie) => {
  try {
    const result = await database.listDocuments(DATABASE_ID, METRICS_COLLECTION_ID, [
      Query.equal("searchTerm", query),
    ]);

    if (result.documents.length > 0) {
      const existingMovie = result.documents[0];
      await database.updateDocument(
        DATABASE_ID,
        METRICS_COLLECTION_ID,
        existingMovie.$id,
        {
          count: existingMovie.count + 1,
        }
      );
    } else {
      await database.createDocument(DATABASE_ID, METRICS_COLLECTION_ID, ID.unique(), {
        searchTerm: query,
        movie_id: movie.$id,
        title: movie.title,
        count: 1,
        poster_url: movie.posterUrl,
      });
    }
  } catch (error) {
    console.error("Error updating search count:", error);
    throw error;
  }
};

export const getTrendingMovies = async (): Promise<
  TrendingMovie[] | undefined
> => {
  try {
    const result = await database.listDocuments(DATABASE_ID, METRICS_COLLECTION_ID, [
      Query.limit(5),
      Query.orderDesc("count"),
    ]);

    return result.documents as unknown as TrendingMovie[];
  } catch (error) {
    console.error(error);
    return undefined;
  }
};


// --- USER AUTHENTICATION FUNCTIONS ---
export const createUser = async (email: string, password: string, username: string) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) throw new Error("Account creation failed");
    await signIn(email, password);
    return newAccount;

  } catch (error: any) {
    console.error("Error in createUser:", error);
    throw new Error(error.message || "Failed to create user.");
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error: any) {
    console.error("Error in signIn:", error);
    throw new Error(error.message || "Failed to sign in.");
  }
};

export const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw new Error("No current user found");
    return currentAccount;
  } catch (error) {
    return null;
  }
};

export const signOut = async () => {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error: any) {
    console.error("Error in signOut:", error);
    throw new Error(error.message);
  }
};


// --- MOVIE DATABASE FUNCTIONS ---
export const getAllMovies = async () => {
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.orderDesc("$createdAt")] // Order by newest first
    );
    return movies.documents;
  } catch (error: any) {
    console.error("Error in getAllMovies:", error);
    throw new Error(error.message);
  }
};

// Search for movies by title
export const searchMovies = async (query: string) => {
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.search("title", query)]
    );
    return movies.documents;
  } catch (error: any) {
    console.error("Error in searchMovies:", error);
    throw new Error(error.message);
  }
};

// Get a single movie by its document ID
export const getMovieById = async (movieId: string) => {
  try {
    const movie = await database.getDocument(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      movieId
    );
    return movie;
  } catch (error: any) {
    console.error("Error in getMovieById:", error);
    throw new Error(error.message);
  }
};