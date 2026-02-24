"use client";

import { useState, useEffect, useRef, RefObject } from "react";

interface IntersectionObserverOptions extends IntersectionObserverInit {}

export const useIntersectionObserver = (
  options: IntersectionObserverOptions = {},
): [RefObject<any>, boolean] => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<Element>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15, ...options },
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.disconnect();
    };
  }, [options]);

  return [ref, isVisible];
};
