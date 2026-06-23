import maplibregl from "maplibre-gl";

export const MAP_THEMES = {
  DEFAULT: {
    id: "DEFAULT",
    name: "DEFAULT",
    filterClass: "filter-monochrome-dark",
  },
  NOIR: {
    id: "NOIR",
    name: "NOIR",
    filterClass: "filter-noir",
    colors: {
      background: "#020202",
      building: "#1b1b1b",
      water: "#090909",
      highway: "#d7d7d7",
      primaryRoad: "#a5a5a5",
      minorRoad: "#6a6a6a",
      boundary: "#595959",
      label: "#e5e5e5",
      landuse: "#050505",
      accent: "#c3d9f3",
    },
  },
};

const originalPaintCache = new Map<string, Record<string, any>>();

export const applyThemeStyle = (mapInstance: maplibregl.Map, themeName: string) => {
  const style = mapInstance.getStyle();
  const layers = style?.layers;
  if (!layers) return;

  const cacheAndSet = (layerId: string, propName: string, newValue: any) => {
    try {
      if (!originalPaintCache.has(layerId)) {
        originalPaintCache.set(layerId, {});
      }
      const cached = originalPaintCache.get(layerId)!;
      if (!(propName in cached)) {
        cached[propName] = mapInstance.getPaintProperty(layerId, propName);
      }
      mapInstance.setPaintProperty(layerId, propName, newValue);
    } catch {
      // Skip if layer property doesn't support setting/getting
    }
  };

  if (themeName === "DEFAULT") {
    // Restore original paint properties from cache first
    originalPaintCache.forEach((paintProps, layerId) => {
      const layer = mapInstance.getLayer(layerId);
      if (layer) {
        Object.entries(paintProps).forEach(([propName, propValue]) => {
          mapInstance.setPaintProperty(layerId, propName, propValue);
        });
      }
    });

    // Style roads to be dark so they invert to highly visible light streets, and labels for maximum legibility
    layers.forEach((layer) => {
      const layerId = layer.id;
      const type = layer.type;
      const sourceLayer = (layer as any)["source-layer"];

      if ((sourceLayer === "transportation" || sourceLayer === "road") && type === "line") {
        const lowerId = layerId.toLowerCase();
        // Exclude rail/train/aeroway to only target drivable streets/highways
        if (!lowerId.includes("rail") && !lowerId.includes("train") && 
            !sourceLayer.includes("aeroway") && !lowerId.includes("aero") && !lowerId.includes("runway")) {
          
          let darkColor = "#bcbcbc"; // minor roads (inverts to subtle hairline dark-gray)
          if (lowerId.includes("motorway") || lowerId.includes("trunk") || lowerId.includes("highway")) {
            darkColor = "#7c7c7c"; // highways (inverts to medium-dark gray)
          } else if (lowerId.includes("primary") || lowerId.includes("secondary")) {
            darkColor = "#9c9c9c"; // primary roads (inverts to medium gray)
          }
          cacheAndSet(layerId, "line-color", darkColor);
        }
      }

      // Style text labels for maximum legibility under inversion
      if (type === "symbol") {
        // Inverted: text should be light gray (#e5e5e5), halo should be dark (#131313)
        // So before inversion: text = #1b1b1b, halo = #ebebeb
        cacheAndSet(layerId, "text-color", "#1b1b1b");
        cacheAndSet(layerId, "text-halo-color", "#ebebeb");
        cacheAndSet(layerId, "text-halo-width", 1.5);
      }
    });
    return;
  }

  if (themeName === "NOIR") {
    const noirColors = MAP_THEMES.NOIR.colors;

    layers.forEach((layer) => {
      const layerId = layer.id;
      const type = layer.type;
      const sourceLayer = (layer as any)["source-layer"];

      // 1. Background layer
      if (type === "background") {
        cacheAndSet(layerId, "background-color", noirColors.background);
      }

      // 2. Water layers
      if (sourceLayer === "water") {
        if (type === "fill") {
          cacheAndSet(layerId, "fill-color", noirColors.water);
        } else if (type === "line") {
          cacheAndSet(layerId, "line-color", noirColors.water);
        }
      }

      // 3. Building layers
      if (sourceLayer === "building") {
        if (type === "fill" || type === "fill-extrusion") {
          cacheAndSet(layerId, "fill-color", noirColors.building);
          cacheAndSet(layerId, "fill-opacity", 0.8);
        }
      }

      // 4. Landuse / Landcover layers
      if (sourceLayer === "landuse" || sourceLayer === "landcover" || sourceLayer === "park") {
        if (type === "fill") {
          cacheAndSet(layerId, "fill-color", noirColors.landuse);
        }
      }

      // 5. Transportation / Road layers
      if (sourceLayer === "transportation" || sourceLayer === "road") {
        if (type === "line") {
          const lowerId = layerId.toLowerCase();
          if (lowerId.includes("motorway") || lowerId.includes("trunk") || lowerId.includes("highway")) {
            cacheAndSet(layerId, "line-color", noirColors.highway);
          } else if (lowerId.includes("primary") || lowerId.includes("secondary")) {
            cacheAndSet(layerId, "line-color", noirColors.primaryRoad);
          } else {
            cacheAndSet(layerId, "line-color", noirColors.minorRoad);
          }
        }
      }

      // 6. Boundaries
      if (sourceLayer === "boundary") {
        if (type === "line") {
          cacheAndSet(layerId, "line-color", noirColors.boundary);
        }
      }

      // 7. Labels and icons (symbol layers)
      if (type === "symbol") {
        cacheAndSet(layerId, "text-color", noirColors.label);
        cacheAndSet(layerId, "text-halo-color", noirColors.background);
        cacheAndSet(layerId, "text-halo-width", 1);
      }
    });
  }
};

export const toggleMapLayerVisibility = (mapInstance: maplibregl.Map, featureType: string, isVisible: boolean) => {
  const style = mapInstance.getStyle();
  const layers = style?.layers;
  if (!layers) return;

  const visibilityValue = isVisible ? "visible" : "none";

  layers.forEach((layer) => {
    const layerId = layer.id;
    const sourceLayer = (layer as any)["source-layer"] || "";
    const lowerId = layerId.toLowerCase();
    const lowerSource = sourceLayer.toLowerCase();

    let matches = false;

    switch (featureType) {
      case "landcover":
        // Filter out park layer to avoid overlaps
        matches = (lowerSource === "landcover" || lowerSource === "landuse") && 
                  !lowerSource.includes("park") && !lowerId.includes("park");
        break;
      case "buildings":
        matches = lowerSource === "building";
        break;
      case "water":
        matches = lowerSource === "water" || lowerId.includes("water");
        break;
      case "parks":
        matches = lowerSource === "park" || lowerId.includes("park") || lowerId.includes("forest") || lowerId.includes("green");
        break;
      case "roads":
        // Regular roads/motorways, excluding railways/trains and aeroways/runways
        matches = (lowerSource === "transportation" || lowerSource === "road") && 
                  !lowerId.includes("rail") && !lowerId.includes("train") && 
                  !lowerSource.includes("aeroway") && !lowerId.includes("aero") && !lowerId.includes("runway");
        break;
      case "rail":
        matches = lowerSource === "transportation" && (lowerId.includes("rail") || lowerId.includes("train"));
        break;
      case "aeroway":
        matches = lowerSource === "aeroway" || lowerId.includes("aero") || lowerId.includes("runway") || lowerId.includes("airport");
        break;
    }

    if (matches) {
      try {
        mapInstance.setLayoutProperty(layerId, "visibility", visibilityValue);
      } catch {
        // Skip if property layout isn't editable
      }
    }
  });
};

