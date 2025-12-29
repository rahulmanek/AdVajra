import React, { Suspense } from 'react';
import { Spinner } from '@wordpress/components';

const LazyView = ({ children, fallback }) => (
    <Suspense fallback={fallback || (<div style={{display:'flex',justifyContent:'center',padding:20}}><Spinner /></div>)}>
        {children}
    </Suspense>
);

export default LazyView;
