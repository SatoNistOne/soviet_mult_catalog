import { useCachedImage } from '../data/images.js';

export default function ArchiveImage({ src, alt, ratio = 'poster', className = '', fit = 'cover' }) {
    const { src: objectUrl, failed } = useCachedImage(src);
    return (
        <span className={`ma-frame ma-frame--${ratio} ${objectUrl ? 'is-ready' : ''} ${className}`}>
            {objectUrl && <img src={objectUrl} alt={alt} style={{ objectFit: fit }} draggable="false" />}
            {!objectUrl && (
                <span className="ma-frame__placeholder" role={src ? undefined : 'img'} aria-label={src ? undefined : alt}>
                    <i className={`bi ${failed || !src ? 'bi-film' : 'bi-hourglass-split'}`} aria-hidden="true" />
                </span>
            )}
        </span>
    );
}
