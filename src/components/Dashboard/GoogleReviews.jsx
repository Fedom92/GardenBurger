import { useState, useEffect } from 'react';

const GoogleReviews = ({ children }) => {
  const [cantOpinionesTotal, setCantOpinionesTotal] = useState(0);
  const [porcenOpinionesTotal, setPorcenOpinionesTotal] = useState(0);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    const pId = process.env.REACT_APP_PID;
    const aK = process.env.REACT_APP_AK;

    const loadGoogleMapsAPI = () => {
      if (!window.google) {
        window.initGoogleMapsAPI = initializeGooglePlaces;

        if (!document.querySelector('script[src^="https://maps.googleapis.com/maps/api/js"]')) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${aK}&libraries=places&callback=initGoogleMapsAPI`;
          document.head.appendChild(script);
        }
      } else {
        initializeGooglePlaces();
      }
    };

    const initializeGooglePlaces = () => {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));

      service.getDetails({ placeId: pId }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setPorcenOpinionesTotal(place.rating);
          setCantOpinionesTotal(place.user_ratings_total);
          setDataReady(true);
        }
      });
    };

    loadGoogleMapsAPI();

    return () => {
      delete window.initGoogleMapsAPI;
    };
  }, []);

  return children({ cantOpinionesTotal, porcenOpinionesTotal, dataReady });
};

export default GoogleReviews;
