interface SpotifyAlbum {
  url: string;
  title: string;
  coverUrl: string | null;
}

const ARTIST_URL =
  "https://open.spotify.com/artist/2NymkQcUWoYwzaR1fTcR6c?si=79GH4sdoTbW3AYOQ3oAJmA&utm_source=copy-link&nd=1&dlsi=ea874c7f182f4403";

const ALBUM_URLS = [
  "https://open.spotify.com/album/6hmjIW4ZgfMZApLMOSpxIj",
  "https://open.spotify.com/album/1oAk5nYBlTgtzjJzKCt0Ie",
  "https://open.spotify.com/album/36YzjieiCRdC1gpRVzLST5",
  "https://open.spotify.com/album/5i1smpPbaurEnopLV0D8pY",
  "https://open.spotify.com/album/2KhnXatqHS9XvxFGTRuWwk",
  "https://open.spotify.com/album/4riJB3SxvAJYg9YwAJQU2i",
  "https://open.spotify.com/album/2uYKRbgLUudwSFKv1hkuxF",
  "https://open.spotify.com/album/3cV78ZcGuQZlCtLen9a0SD",
];

function proxiedImageUrl(originalUrl: string): string {
  return `/api/spotify-image?url=${encodeURIComponent(originalUrl)}`;
}

async function fetchAlbumMeta(url: string): Promise<SpotifyAlbum> {
  try {
    const res = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("oembed failed");
    const data = await res.json();
    console.log("Spotify oembed success:", url, data.thumbnail_url);
    return {
      url,
      title: data.title || "Spotify Album",
      coverUrl: data.thumbnail_url ? proxiedImageUrl(data.thumbnail_url) : null,
    };
  } catch (err) {
    console.error("Spotify oembed FAILED:", url, err);
    return { url, title: "Spotify Album", coverUrl: null };
  }
}


const ORBIT_POSITIONS = [
  { top: "2%", left: "50%", size: "w-24 h-24 sm:w-32 sm:h-32", delay: "0s", duration: "7s" },
  { top: "16%", left: "84%", size: "w-20 h-20 sm:w-28 sm:h-28", delay: "0.9s", duration: "8s" },
  { top: "50%", left: "94%", size: "w-24 h-24 sm:w-32 sm:h-32", delay: "1.6s", duration: "6.5s" },
  { top: "84%", left: "84%", size: "w-20 h-20 sm:w-28 sm:h-28", delay: "0.4s", duration: "7.5s" },
  { top: "96%", left: "50%", size: "w-24 h-24 sm:w-32 sm:h-32", delay: "1.2s", duration: "8.2s" },
  { top: "84%", left: "16%", size: "w-20 h-20 sm:w-28 sm:h-28", delay: "2s", duration: "6.8s" },
  { top: "50%", left: "6%", size: "w-24 h-24 sm:w-32 sm:h-32", delay: "0.7s", duration: "7.2s" },
  { top: "16%", left: "16%", size: "w-20 h-20 sm:w-28 sm:h-28", delay: "1.9s", duration: "8.5s" },
];

export default async function SpotifyShowcase() {
  const albums = await Promise.all(ALBUM_URLS.map(fetchAlbumMeta));

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-semibold sm:text-3xl">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#1DB954]">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.14 4.32-1.32 9.719-.66 13.439 1.621.361.181.54.78.301 1.2zm.12-3.42C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Spotify
        </h2>
        <p className="mt-2 text-muted-foreground">
          Our releases orbiting around Spotify.
        </p>
      </div>

      {/* Galaxy container */}
      <div className="relative mx-auto aspect-square w-full max-w-[600px]">
        {/* Center big Spotify logo — links to artist page */}
        <a
          href={ARTIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute left-1/2 top-1/2 z-10 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black shadow-2xl transition hover:scale-105 sm:h-52 sm:w-52"
        >
          <svg viewBox="0 0 24 24" className="h-24 w-24 fill-[#1DB954] sm:h-32 sm:w-32">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.14 4.32-1.32 9.719-.66 13.439 1.621.361.181.54.78.301 1.2zm.12-3.42C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </a>

        {/* Floating album covers around it */}
        {albums.map((album, i) => {
          const pos = ORBIT_POSITIONS[i % ORBIT_POSITIONS.length];
          return (
            <a
              key={album.url}
              href={album.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`spotify-float group absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl transition hover:scale-110 hover:shadow-2xl ${pos.size}`}
              style={{
                top: pos.top,
                left: pos.left,
                animationDelay: pos.delay,
                animationDuration: pos.duration,
              }}
            >
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#1DB954]/10">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#1DB954]">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z" />
                  </svg>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}