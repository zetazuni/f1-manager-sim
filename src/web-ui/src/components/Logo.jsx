import React from 'react';

/** The Zetrace shield (public/logo.svg). */
const Logo = ({ className = 'h-9 w-9' }) => (
  <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Zetrace" className={`shrink-0 ${className}`} />
);

export default Logo;
