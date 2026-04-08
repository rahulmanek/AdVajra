import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Spinner, RadioControl, BaseControl, Button } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';
import ServerSideRender from '@wordpress/server-side-render';

const AdVajraIcon = (
    <svg width="48" height="48" viewBox="0 0 662 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 39.1517C0 0 0 0 52.8 0H607.2C661 0 661 0 662 21.6229L660 450.245C660 471.868 636.361 478.396 607.2 489.396L326.04 600L52.8 489.396C23.6394 477.396 0 471.868 0 450.245V39.1517Z" fill="#0F1C2E"/>
        <path d="M12 49.5856C12 12 12 12 62.88 12H597.12C648 12 648 12 648 49.5856V444.235C648 464.993 625.22 471.261 597.12 481.821L326.184 588L62.88 481.821C34.7797 470.301 12 464.993 12 444.235V49.5856Z" fill="#F2F2F2"/>
        <circle cx="74" cy="53" r="13" fill="#0F1C2E"/>
        <circle cx="165" cy="53" r="13" fill="#0F1C2E"/>
        <circle cx="119" cy="53" r="13" fill="#0F1C2E"/>
        <path d="M35 119.473V89H46.7849H58.5H82.2H577.8L616.5 89.1366H625V104.305V119.473V439.44C625 456.27 603.868 461.352 577.8 469.914L326.46 568L82.2 469.914C56.1322 460.574 35 456.27 35 439.44V119.473Z" fill="#0F1C2E"/>
        <mask id="path-7-inside-1_16_53" fill="white">
            <rect x="61" y="123" width="539" height="314" rx="12"/>
        </mask>
        <rect x="61" y="123" width="539" height="314" rx="12" stroke="#F2F2F2" strokeWidth="30" mask="url(#path-7-inside-1_16_53)"/>
        <rect x="105" y="166" width="255" height="140" rx="10" fill="url(#paint0_linear_16_53)"/>
        <rect x="428" y="326" width="130" height="75" rx="10" fill="url(#paint1_linear_16_53)" fillOpacity="0.2" shapeRendering="crispEdges"/>
        <rect x="428" y="231" width="130" height="75" rx="10" fill="url(#paint2_linear_16_53)" fillOpacity="0.2" shapeRendering="crispEdges"/>
        <path d="M497.545 46.7002C500.212 44.157 504.345 43.9234 507.283 46.1777C510.269 48.4688 511.094 52.6185 509.213 55.8779L404.836 236.664H479.346C482.407 236.664 485.161 238.524 486.304 241.364C487.446 244.204 486.748 247.453 484.54 249.573L233.194 490.91C230.5 493.497 226.314 493.707 223.374 491.403C220.434 489.1 219.638 484.984 221.505 481.75L318.355 314H248.346C245.312 314 242.578 312.173 241.417 309.37C240.256 306.568 240.897 303.341 243.042 301.196L497.414 46.8252L497.542 46.6963L497.545 46.7002Z" fill="url(#paint3_linear_16_53)" stroke="#0B1A30" strokeWidth="15" strokeLinejoin="round"/>
        <defs>
            <linearGradient id="paint0_linear_16_53" x1="146.5" y1="189.5" x2="274.5" y2="256" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFE066"/>
                <stop offset="1" stopColor="#E6A800"/>
            </linearGradient>
            <linearGradient id="paint1_linear_16_53" x1="536.5" y1="338" x2="520.5" y2="376" gradientUnits="userSpaceOnUse">
                <stop stopColor="#34475F"/>
                <stop offset="1" stopColor="#1F2E44"/>
            </linearGradient>
            <linearGradient id="paint2_linear_16_53" x1="536.5" y1="243" x2="520.5" y2="281" gradientUnits="userSpaceOnUse">
                <stop stopColor="#34475F"/>
                <stop offset="1" stopColor="#1F2E44"/>
            </linearGradient>
            <linearGradient id="paint3_linear_16_53" x1="336.346" y1="129.5" x2="365.846" y2="325.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFE66D"/>
                <stop offset="1" stopColor="#EDAF03"/>
            </linearGradient>
        </defs>
    </svg>
);

export default function Edit({ attributes, setAttributes, isSelected }) {
    const { type, id } = attributes;
    const [isEditing, setIsEditing] = useState(false);
    
    const [ads, setAds] = useState([]);
    const [placements, setPlacements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        Promise.all([
            apiFetch({ path: '/advajra/v1/ads' }).catch(() => []),
            apiFetch({ path: '/advajra/v1/placements' }).catch(() => [])
        ]).then(([adsData, placementsData]) => {
            if (!isMounted) return;
            setAds(adsData || []);
            setPlacements((placementsData || []).filter((placement) => placement?.type === 'shortcode'));
            setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, []);

    const adOptions = [
        { label: __('Select an Ad...', 'advajra'), value: '' },
        ...ads.map(ad => ({
            label: ad.title.raw || 'Untitled',
            value: ad.id.toString()
        }))
    ];

    const placementOptions = [
        { label: __('Select a Manual Placement...', 'advajra'), value: '' },
        ...placements.map(plc => ({
            label: plc.name || 'Untitled',
            value: plc.id.toString()
        }))
    ];

    const isConfigured = !!id;
    const showSetup = !isConfigured || isEditing;

    const blockProps = useBlockProps();

    return (
        <div { ...blockProps }>
            <InspectorControls>
                <PanelBody title={__('AdVajra Settings', 'advajra')}>
                    {isLoading ? <Spinner /> : (
                        <div style={{ padding: '4px' }}>
                            <BaseControl>
                                <RadioControl
                                    label={__('Display Target', 'advajra')}
                                    selected={type}
                                    options={[
                                        { label: 'Specific Ad', value: 'ad' },
                                        { label: 'Manual Placement', value: 'placement' },
                                    ]}
                                    onChange={(val) => setAttributes({ type: val, id: '' })}
                                />
                            </BaseControl>

                            <div style={{ marginTop: '16px' }}>
                                <SelectControl
                                    label={type === 'ad' ? __('Available Ads', 'advajra') : __('Available Manual Placements', 'advajra')}
                                    value={id}
                                    options={type === 'ad' ? adOptions : placementOptions}
                                    onChange={(val) => setAttributes({ id: val })}
                                />
                            </div>
                        </div>
                    )}
                </PanelBody>
            </InspectorControls>

            {showSetup ? (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '12px',
                    padding: '32px 24px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{ marginBottom: '16px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))', width: '48px', height: '48px' }}>
                        {AdVajraIcon}
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '20px', fontWeight: '600' }}>
                        {__('AdVajra Core Engine', 'advajra')}
                    </h3>
                    <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', textAlign: 'center', maxWidth: '300px' }}>
                        {__('Configure the display target below to inject an ad natively into this position.', 'advajra')}
                    </p>
                    
                    <div style={{ width: '100%', maxWidth: '320px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {isLoading ? <Spinner /> : (
                            <div style={{ padding: '4px' }}>
                                <BaseControl>
                                    <RadioControl
                                        label={__('Display Target', 'advajra')}
                                        selected={type}
                                        options={[
                                            { label: 'Specific Ad', value: 'ad' },
                                            { label: 'Manual Placement', value: 'placement' },
                                        ]}
                                        onChange={(val) => setAttributes({ type: val, id: '' })}
                                    />
                                </BaseControl>

                                <div style={{ marginTop: '16px' }}>
                                    <SelectControl
                                        label={type === 'ad' ? __('Available Ads', 'advajra') : __('Available Manual Placements', 'advajra')}
                                        value={id}
                                        options={type === 'ad' ? adOptions : placementOptions}
                                        onChange={(val) => setAttributes({ id: val })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {isConfigured && (
                        <div style={{ marginTop: '16px' }}>
                            <button
                                style={{
                                    background: '#0f172a', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500'
                                }}
                                onClick={() => setIsEditing(false)}
                            >
                                {__('Done', 'advajra')}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ opacity: isSelected ? 0.9 : 1, position: 'relative' }}>
                    {isSelected && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '8px', 
                            right: '8px', 
                            zIndex: 10 
                        }}>
                            <Button 
                                variant="primary" 
                                style={{ background: '#0f172a', color: '#fff', borderRadius: '4px' }}
                                onClick={() => setIsEditing(true)}
                            >
                                {__('Edit Settings', 'advajra')}
                            </Button>
                        </div>
                    )}
                    <div style={{
                        pointerEvents: isSelected ? 'none' : 'auto',
                        border: isSelected ? '2px dashed #cbd5e1' : 'none',
                        borderRadius: isSelected ? '4px' : '0'
                    }}>
                        <ServerSideRender
                            block="advajra/ad"
                            attributes={{ type, id }}
                            EmptyResponsePlaceholder={() => (
                                <div style={{
                                    padding: '16px',
                                    background: '#fef2f2',
                                    border: '1px dashed #ef4444',
                                    borderRadius: '8px',
                                    color: '#991b1b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{ width: '32px', height: '32px' }}>{AdVajraIcon}</div>
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '14px' }}>{__('AdVajra Block Configured', 'advajra')}</strong>
                                        <span style={{ fontSize: '13px', opacity: 0.8 }}>{__('This target does not return content for the current preview context.', 'advajra')}</span>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
