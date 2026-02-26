import { Client, Databases, ID, Query, Account, Models, Functions } from "react-native-appwrite";

// --- CONFIGURATION & CLIENT SETUP ---
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const METRICS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const MOVIES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_MOVIES_COLLECTION_ID!;
export const PURCHASES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_PURCHASES_COLLECTION_ID!;
const PROFILES_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

const database = new Databases(client);
const account = new Account(client);
const functions = new Functions(client); 

export const appwrite = {
  database,
  functions,
  account,
};

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

export const getTrendingMovies = async (): Promise<TrendingMovie[]> => {
  try {
    const result = await database.listDocuments(DATABASE_ID, METRICS_COLLECTION_ID, [
      Query.limit(25),
      Query.orderDesc("count"),
    ]);

    if (!result.documents || result.documents.length === 0) {
      return [];
    }

    const searchEvents = result.documents as unknown as TrendingMovie[];

    const movieCounts: { [key: string]: { count: number; movie: TrendingMovie } } = {};

    for (const event of searchEvents) {
      const movieId = event.movie_id.toString();
      if (movieCounts[movieId]) {
        movieCounts[movieId].count += event.count;
      } else {
        movieCounts[movieId] = {
          count: event.count,
          movie: event,
        };
      }
    }

    const aggregatedMovies = Object.values(movieCounts);
    aggregatedMovies.sort((a, b) => b.count - a.count);
    return aggregatedMovies.slice(0, 5).map(item => item.movie);

  } catch (error) {
    console.error("Error in getTrendingMovies:", error);
    return [];
  }
};

export const getUserPurchases = async (userId: string): Promise<Purchase[]> => {
  try {
    const now = new Date().toISOString();

    const purchases = await database.listDocuments(
      DATABASE_ID,
      PURCHASES_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('status', 'PAID'),
        Query.greaterThan('expiresAt', now)
      ]
    );
    return purchases.documents as unknown as Purchase[];
  } catch (error: any) {
    console.error("Error in getUserPurchases:", error);
    throw new Error(error.message);
  }
};

// --- USER AUTHENTICATION FUNCTIONS ---
export const createUser = async (phone: string, password: string, username: string, registrationId: string) => {
  try {
    const email = `${phone}@example.com`;
    
    // 1. Create the Auth user
    const newAccount = await account.create(ID.unique(), email, password, username);
    if (!newAccount) throw new Error("Account creation failed");

    // 2. Sign the user in immediately to get a session
    await signIn(phone, password);
    
    // 3. Create the corresponding document in the 'profiles' collection
    //    We use the new user's ID as the document ID for easy mapping
    await database.createDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        newAccount.$id, // Use the user's ID as the document ID
        {
            userId: newAccount.$id,
            registrationId: registrationId
        }
    );

    // This part is now redundant as we don't use prefs, but it doesn't hurt
    await account.updatePhone(`+976${phone}`, password);

    return newAccount;

  } catch (error: any) {
    console.error("Error in createUser:", error);
    throw new Error(error.message || "Failed to create user.");
  }
};

export const signIn = async (phone: string, password: string) => {
  try {
    // 1. Create the dummy email from the phone number
    const email = `${phone}@example.com`;

    // 2. Use the standard email/password session creation method
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
export const getAllMovies = async (): Promise<Movie[]> => { // <-- Add explicit return type
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.orderDesc("$createdAt")]
    );
    // Use 'as' to cast the generic Document[] to your specific Movie[]
    return movies.documents as Movie[];
  } catch (error: any) {
    console.error("Error in getAllMovies:", error);
    throw new Error(error.message);
  }
};

// Search for movies by title
export const searchMovies = async (query: string): Promise<Movie[]> => { // <-- Add explicit return type
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.search("title", query)]
    );
    // Use 'as' to cast the generic Document[] to your specific Movie[]
    return movies.documents as Movie[];
  } catch (error: any) {
    console.error("Error in searchMovies:", error);
    throw new Error(error.message);
  }
};

// Get a single movie by its document ID
export const getMovieById = async (movieId: string): Promise<Movie | null> => { // 1. Add explicit return type
  try {
    const movie = await database.getDocument(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      movieId
    );
    // 2. Use a two-step cast to tell TypeScript the true shape of the document
    return movie as unknown as Movie;
  } catch (error: any) {
    // --- THIS IS THE FIX ---
    // Check if the error message indicates that the document was not found.
    // This is a common and expected case in our 'save' page logic.
    if (error.message && error.message.includes('could not be found')) {
      // It's a "not found" error. Fail silently by returning null without logging.
    } else {
      // It's a different, unexpected error (e.g., network failure, permissions issue).
      // We SHOULD log these to help with debugging future problems.
      console.error(`Unexpected error fetching movie by ID ${movieId}:`, error.message);
    }
    
    // In either case, return null to the calling function.
    return null;
  }
};

export const getMoviesByCategory = async (category: string): Promise<Movie[]> => {
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      // Use Query.search, which works with a full-text index
      [Query.search("categories", category)]
    );
    return movies.documents as unknown as Movie[];
  } catch (error: any) {
    console.error("Error in getMoviesByCategory:", error);
    throw new Error(error.message);
  }
};

export const checkForAccess = async (movie: Movie, userId: string): Promise<boolean> => {
  try {
    if (!movie || !userId) return false;

    const userPurchases = await getUserPurchases(userId);
    if (userPurchases.length === 0) return false; // No purchases, no access

    // --- The Correct "Waterfall" Logic ---

    // 1. Check for the highest tier: Premium
    // The .some() method is perfect for checking if at least one item in an array meets a condition.
    const hasPremium = userPurchases.some(p => p.movieId === 'ALL_ACCESS_PREMIUM');
    if (hasPremium) {
      console.log(`Access granted for user ${userId} via Premium subscription.`);
      return true; // Premium grants access to everything.
    }

    // 2. If no premium, check for Series access (if content is a series)
    if (movie.type === 'series') {
      const hasSeriesAccess = userPurchases.some(p => p.movieId === 'ALL_ACCESS_SERIES');
      if (hasSeriesAccess) {
        console.log(`Access granted for user ${userId} via Series subscription.`);
        return true;
      }
    }

    // 3. If no series access, check for Movie access (if content is a movie)
    if (movie.type === 'movie') {
      const hasMoviesAccess = userPurchases.some(p => p.movieId === 'ALL_ACCESS_MOVIES');
      if (hasMoviesAccess) {
        console.log(`Access granted for user ${userId} via Movies subscription.`);
        return true;
      }
    }

    // 4. If none of the above, deny access.
    console.log(`Access denied for user ${userId} for movie ${movie.$id}.`);
    return false;

  } catch (error) {
    console.error("Error in checkForAccess:", error);
    return false; // Default to no access on error
  }
};