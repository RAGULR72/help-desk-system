import React from 'react';
import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

const SEO = ({ title, description, keywords, image, url, type = 'website' }) => {
    const siteTitle = 'Proserve Help Desk';
    const defaultDescription = 'Official Help Desk Portal for Proserve Business Solutions. Manage tickets, SLAs, and technical support efficiently.';
    const defaultImage = 'https://www.proservehelpdesk.in/api/placeholder/1200/630';
    const siteUrl = 'https://www.proservehelpdesk.in';

    const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const finalDescription = description || defaultDescription;
    const finalUrl = url ? `${siteUrl}${url}` : siteUrl;
    const finalImage = image || defaultImage;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={finalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={finalUrl} />
            <meta property="twitter:title" content={finalTitle} />
            <meta property="twitter:description" content={finalDescription} />
            <meta property="twitter:image" content={finalImage} />
        </Helmet>
    );
};

SEO.propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    keywords: PropTypes.string,
    image: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string
};

export default SEO;
