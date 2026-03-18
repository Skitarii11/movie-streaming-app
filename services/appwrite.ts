import {
  Account,
  Client,
  Databases,
  Functions,
  ID,
  Models,
  Query,
} from "react-native-appwrite";

// --- CONFIGURATION & CLIENT SETUP ---
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const METRICS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;
const MOVIES_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_MOVIES_COLLECTION_ID!;
export const PURCHASES_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PURCHASES_COLLECTION_ID!;
const PROFILES_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

const HISTORY_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_HISTORY_COLLECTION_ID!;
const FAVORITES_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID!;

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
    const result = await database.listDocuments(
      DATABASE_ID,
      METRICS_COLLECTION_ID,
      [Query.equal("searchTerm", query)],
    );

    if (result.documents.length > 0) {
      const existingMovie = result.documents[0];
      await database.updateDocument(
        DATABASE_ID,
        METRICS_COLLECTION_ID,
        existingMovie.$id,
        {
          count: existingMovie.count + 1,
        },
      );
    } else {
      await database.createDocument(
        DATABASE_ID,
        METRICS_COLLECTION_ID,
        ID.unique(),
        {
          searchTerm: query,
          movie_id: movie.$id,
          title: movie.title,
          count: 1,
          poster_url: movie.posterUrl,
        },
      );
    }
  } catch (error) {
    console.error("Error updating search count:", error);
    throw error;
  }
};

export const getTrendingMovies = async (): Promise<TrendingMovie[]> => {
  try {
    const result = await database.listDocuments(
      DATABASE_ID,
      METRICS_COLLECTION_ID,
      [Query.limit(25), Query.orderDesc("count")],
    );

    if (!result.documents || result.documents.length === 0) {
      return [];
    }

    const searchEvents = result.documents as unknown as TrendingMovie[];

    const movieCounts: {
      [key: string]: { count: number; movie: TrendingMovie };
    } = {};

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
    return aggregatedMovies.slice(0, 5).map((item) => item.movie);
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
        Query.equal("userId", userId),
        Query.equal("status", "PAID"),
        Query.greaterThan("expiresAt", now),
      ],
    );
    return purchases.documents as unknown as Purchase[];
  } catch (error: any) {
    console.error("Error in getUserPurchases:", error);
    throw new Error(error.message);
  }
};

// --- USER AUTHENTICATION FUNCTIONS ---
export const createUser = async (
  phone: string,
  password: string,
  username: string,
  registrationId: string,
) => {
  try {
    const email = `${phone}@example.com`;

    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username,
    );
    if (!newAccount) throw new Error("Account creation failed");

    await signIn(phone, password);

    await database.createDocument(
      DATABASE_ID,
      PROFILES_COLLECTION_ID,
      newAccount.$id,
      {
        userId: newAccount.$id,
        registrationId: registrationId,
      },
    );

    await account.updatePhone(`+976${phone}`, password);

    return newAccount;
  } catch (error: any) {
    console.error("Error in createUser:", error);
    throw new Error(error.message || "Failed to create user.");
  }
};

export const signIn = async (phone: string, password: string) => {
  try {
    const email = `${phone}@example.com`;

    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error: any) {
    console.error("Error in signIn:", error);
    throw new Error(error.message || "Failed to sign in.");
  }
};

export const getCurrentUser =
  async (): Promise<Models.User<Models.Preferences> | null> => {
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
export const getAllMovies = async (page: number, limit: number = 10): Promise<Movie[]> => {
  try {
    const offset = (page - 1) * limit;

    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );
    return movies.documents as Movie[];
  } catch (error: any) {
    console.error("Error in getAllMovies:", error);
    throw new Error(error.message);
  }
};

// Search for movies by title
export const searchMovies = async (query: string): Promise<Movie[]> => {
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.search("title", query),Query.limit(100)],
    );
    return movies.documents as Movie[];
  } catch (error: any) {
    console.error("Error in searchMovies:", error);
    throw new Error(error.message);
  }
};

// Get a single movie by its document ID
export const getMovieById = async (movieId: string): Promise<Movie | null> => {
  try {
    const movie = await database.getDocument(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      movieId,
    );
    return movie as unknown as Movie;
  } catch (error: any) {
    if (error.message && error.message.includes("could not be found")) {
    } else {
      console.error(
        `Unexpected error fetching movie by ID ${movieId}:`,
        error.message,
      );
    }
    return null;
  }
};

export const getMoviesByCategory = async (
  category: string,
): Promise<Movie[]> => {
  try {
    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      [Query.search("categories", category),
        Query.limit(100)
      ],
    );
    return movies.documents as unknown as Movie[];
  } catch (error: any) {
    console.error("Error in getMoviesByCategory:", error);
    throw new Error(error.message);
  }
};

export const checkForAccess = async (
  movie: Movie,
  userId: string,
): Promise<boolean> => {
  try {
    if (!movie || !userId) return false;

    const userPurchases = await getUserPurchases(userId);
    if (userPurchases.length === 0) return false;

    const hasPremium = userPurchases.some(
      (p) => p.movieId === "ALL_ACCESS_PREMIUM",
    );
    if (hasPremium) {
      console.log(
        `Access granted for user ${userId} via Premium subscription.`,
      );
      return true;
    }

    if (movie.type === "series") {
      const hasSeriesAccess = userPurchases.some(
        (p) => p.movieId === "ALL_ACCESS_SERIES",
      );
      if (hasSeriesAccess) {
        console.log(
          `Access granted for user ${userId} via Series subscription.`,
        );
        return true;
      }
    }

    if (movie.type === "short_drama") {
      const hasMoviesAccess = userPurchases.some(
        (p) => p.movieId === "ALL_ACCESS_MOVIES",
      );
      if (hasMoviesAccess) {
        console.log(
          `Access granted for user ${userId} via Movies subscription.`,
        );
        return true;
      }
    }

    console.log(`Access denied for user ${userId} for movie ${movie.$id}.`);
    return false;
  } catch (error) {
    console.error("Error in checkForAccess:", error);
    return false;
  }
};

export const getWatchHistory = async (
  userId: string,
): Promise<WatchHistoryItem[]> => {
  try {
    const history = await database.listDocuments(
      DATABASE_ID,
      HISTORY_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.orderDesc("watchedAt"),
        Query.limit(10), // Limit to 10 for performance
      ],
    );
    return history.documents as unknown as WatchHistoryItem[];
  } catch (error: any) {
    console.error("Error in getWatchHistory:", error);
    throw new Error(error.message);
  }
};

export const addWatchHistory = async (userId: string, movieId: string) => {
  try {
        const existingHistory = await database.listDocuments(
            DATABASE_ID,
            HISTORY_COLLECTION_ID,
            [
                Query.equal('userId', userId),
                Query.equal('movieId', movieId)
            ]
        );

        const now = new Date().toISOString();

        if (existingHistory.documents.length > 0) {
            const docId = existingHistory.documents[0].$id;
            console.log(`Updating watch history for movie: ${movieId}`);
            await database.updateDocument(
                DATABASE_ID,
                HISTORY_COLLECTION_ID,
                docId,
                { watchedAt: now } // Just update the time
            );
        } else {
            console.log(`Creating new watch history for movie: ${movieId}`);
            await database.createDocument(
                DATABASE_ID,
                HISTORY_COLLECTION_ID,
                ID.unique(),
                {
                    userId,
                    movieId,
                    watchedAt: now
                }
            );
        }
    } catch (error: any) {
        console.error("Error in addWatchHistory:", error);
        throw new Error(error.message);
    }
};

export const getFavorites = async (userId: string): Promise<FavoriteItem[]> => {
  try {
    const favorites = await database.listDocuments(
      DATABASE_ID,
      FAVORITES_COLLECTION_ID,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(100)],
    );
    return favorites.documents as unknown as FavoriteItem[];
  } catch (error: any) {
    console.error("Error in getFavorites:", error);
    throw new Error(error.message);
  }
};

export const addFavorite = async (userId: string, movieId: string) => {
  try {
    const existingFavorites = await database.listDocuments(
      DATABASE_ID,
      FAVORITES_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('movieId', movieId)
      ]
    );

    if (existingFavorites.documents.length === 0) {
      await database.createDocument(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          movieId,
        }
      );
      console.log(`Added movie ${movieId} to favorites for user ${userId}.`);
    } else {
      console.log(`Movie ${movieId} is already in favorites for user ${userId}. Doing nothing.`);
    }
  } catch (error: any) {
    console.error("Error in addFavorite:", error);
    throw new Error(error.message);
  }
};

export const removeFavorite = async (docId: string) => {
  try {
    await database.deleteDocument(DATABASE_ID, FAVORITES_COLLECTION_ID, docId);
  } catch (error: any) {
    console.error("Error in removeFavorite:", error);
    throw new Error(error.message);
  }
};

export const queryMovies = async (
    query: string,
    type: 'all' | 'series' | 'short_drama',
    category: string
): Promise<Movie[]> => {
  try {
    const queries: string[] = [];

    if (query) {
      queries.push(Query.search("title", query));
    }

    if (type !== 'all') {
      queries.push(Query.equal("type", type));
    }

    if (category !== 'all') {
      queries.push(Query.search("categories", category));
    }

    const movies = await database.listDocuments(
      DATABASE_ID,
      MOVIES_COLLECTION_ID,
      queries
    );
    return movies.documents as unknown as Movie[];
  } catch (error: any) {
    console.error("Error in queryMovies:", error);
    throw new Error(error.message);
  }
};