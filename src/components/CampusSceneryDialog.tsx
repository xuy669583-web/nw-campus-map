import { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, Image, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

interface Album {
  id: string;
  title: string;
  cover: string;
  images: string[];
}

const ALBUMS: Album[] = [
  { id: 'buildings', title: '校园建筑', cover: '/buildings/01_正门(1).jpg', images: ['/buildings/01_正门(1).jpg','/buildings/02_如意湖1(1).jpg','/buildings/03_如意湖2(1).JPG','/buildings/04_如意湖3(1).JPG','/buildings/05_博物馆(1).jpg','/buildings/06_云亭苑(1).JPG','/buildings/07_办公楼(1).JPG','/buildings/08_音乐厅(1).JPG','/buildings/09_田家炳教育书院(1).JPG','/buildings/10_校史馆_逸夫图书馆(1).JPG'] },
  { id: 'history', title: '历史的印记', cover: '/buildings/01_国立西北联合大学.jpg', images: ['/buildings/01_国立西北联合大学.jpg','/buildings/02_40年代西北师范学院校门.jpg','/buildings/03_50年代甘肃师范大学校门.jpg','/buildings/04_1981年西北师范学院校门.jpg','/buildings/05_1944年大礼堂.jpg','/buildings/06_40年代校舍.jpg','/buildings/07_1941-1954年校舍.jpg','/buildings/08_80年代校舍.jpg','/buildings/09_1986年电教中心大楼.jpg','/buildings/10_1979年音乐楼.jpg','/buildings/11_1979年美术楼.jpg','/buildings/12_1954年南单楼.jpg','/buildings/13_1958年体操房.jpg','/buildings/14_1940年图书馆.jpg','/buildings/15_1940年图书馆.jpg','/buildings/16_1940年图书馆.jpg','/buildings/17_1998年逸夫图书馆.jpg','/buildings/18_1998年逸夫图书馆.jpg','/buildings/19_1954年旧文科楼.jpg','/buildings/20_水塔各时期.jpg'] },
  { id: 'spring', title: '春季校园', cover: '/buildings/06_春映师大(1).jpg', images: ['/buildings/01_体育馆(1).jpg','/buildings/02_园林小品(1).jpg','/buildings/03_艺苑(1).jpg','/buildings/04_图书馆_新(1).jpg','/buildings/05_校园一角(1).jpg','/buildings/06_春映师大(1).jpg','/buildings/07_校徽(1).jpg','/buildings/08_师大光影(1).JPG','/buildings/09_校园一角(1).jpg','/buildings/10_校史馆(1).jpg','/buildings/11_致公楼(1).jpg','/buildings/12_博物馆(1).jpg','/buildings/13_田家炳(1).jpg','/buildings/14_如意湖(1).jpg','/buildings/15_致勤楼(1).jpg','/buildings/16_师大光影(1).jpg','/buildings/17_校园一角(1).jpg','/buildings/18_体育馆(1).jpg','/buildings/19_东苑餐厅(1).jpg','/buildings/20_如意湖(1).jpg','/buildings/21_云衢楼夜景(1).jpg','/buildings/22_致公楼(1).jpg','/buildings/23_师大高清大全景(1).jpg','/buildings/24_师大光影(1).jpg','/buildings/25_校园全景(1).jpg','/buildings/26_正门(1).jpg','/buildings/27_如意湖(1).jpg','/buildings/28_致公楼(1).jpg','/buildings/29_艺苑(1).jpg','/buildings/30_如意湖(1).jpg','/buildings/31_致朴楼(1).jpg','/buildings/32_田家炳夜景(1).jpg','/buildings/33_老协(1).jpg','/buildings/34_如意湖(1).jpg','/buildings/35_校训石(1).jpg','/buildings/36_师大光影(1).jpg','/buildings/37_师大光影(1).jpg'] },
  { id: 'summer', title: '夏季校园', cover: '/buildings/05_如意湖(1).jpg', images: ['/buildings/01_博物馆(1).jpg','/buildings/02_东操场(1).jpg','/buildings/03_东操场(1).jpg','/buildings/04_全景(1).jpg','/buildings/05_如意湖(1).jpg','/buildings/06_师大光影(1).jpg','/buildings/07_师大光影(1).jpg','/buildings/08_校园一景(1).jpg','/buildings/09_逸夫图书馆(1).jpg','/buildings/10_致善楼(1).jpg'] },
  { id: 'autumn', title: '秋季校园', cover: '/buildings/04_西师之秋(1).jpg', images: ['/buildings/01_如意湖(1).jpg','/buildings/02_师大光影(1).jpg','/buildings/03_图书馆_新(1).jpg','/buildings/04_西师之秋(1).jpg','/buildings/05_校园景色(1).jpg','/buildings/06_校园一角(1).jpg','/buildings/07_校园主干道(1).jpg','/buildings/08_学知园(1).jpg','/buildings/09_云衢楼(1).jpg','/buildings/10_云衢楼(1).jpg','/buildings/11_云衢楼(1).jpg','/buildings/12_致公楼(1).jpg','/buildings/13_致善楼(1).jpg'] },
  { id: 'winter', title: '冬季校园', cover: '/buildings/01_校训石(1).jpg', images: ['/buildings/01_校训石(1).jpg','/buildings/02_学生发展中心(1).jpg','/buildings/03_逸夫图书馆(1).jpg','/buildings/04_致公楼(1).jpg'] },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/* ===== Image Lightbox Component ===== */
function ImageLightbox({ images, initialIdx, onClose }: { images: string[]; initialIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIdx);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(p => (p - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx(p => (p + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)', pointerEvents: 'auto' }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-[71] w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
        <X size={22} />
      </button>
      <div className="relative flex items-center justify-center" style={{ width: '90vw', height: '85vh' }} onClick={e => e.stopPropagation()}>
        <img src={images[idx]} alt="" className="max-w-full max-h-full object-contain rounded-lg" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => (p - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <ChevronLeft size={24} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIdx(p => (p + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <ChevronRight size={24} />
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {images.map((_: string, i: number) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className="rounded-full transition-all" style={{
                  width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? 'var(--gold)' : 'rgba(255,255,255,0.4)'
                }} />
              ))}
              <span className="ml-2 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{idx + 1} / {images.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CampusSceneryDialog({ open, onClose }: Props) {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Auto-play slideshow
  useEffect(() => {
    if (!selectedAlbum || lightboxOpen) return;
    const images = selectedAlbum.images;
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setPhotoIdx(prev => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedAlbum, lightboxOpen]);

  const openLightbox = useCallback((idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  }, []);

  if (!open) return null;

  // ===== Album Detail View =====
  if (selectedAlbum) {
    const images = selectedAlbum.images;
    return (
      <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
        <div className="backdrop-modern absolute inset-0" onClick={() => { setSelectedAlbum(null); onClose(); }} />
        <div className="relative w-full dialog-modern animate-slide-up-elastic flex flex-col" style={{ maxHeight: '60vh', zIndex: 61 }}>
          <div className="gold-line" />
          {/* Header */}
          <div className="flex items-center px-4 py-3 flex-shrink-0" style={{ background: 'var(--navy-deep)' }}>
            <button onClick={() => setSelectedAlbum(null)} className="mr-2" style={{ color: '#fff' }}>
              <ArrowLeft size={20} />
            </button>
            <h2 className="flex-1 text-base font-bold text-white">{selectedAlbum.title}</h2>
            <button onClick={onClose} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <X size={20} />
            </button>
          </div>
          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3" style={{ background: '#fff' }}>
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--text-muted)' }}>
                <Image size={48} className="mb-3" />
                <p className="text-sm">相册为空</p>
                <p className="text-xs mt-1">后续将添加照片</p>
              </div>
            ) : (
              <>
                {/* Main photo - clickable to open lightbox */}
                <div
                  className="relative mb-3 rounded-xl overflow-hidden cursor-pointer group"
                  style={{ aspectRatio: '16/10', maxHeight: '30vh', border: '1px solid var(--border-light)' }}
                  onClick={() => openLightbox(photoIdx)}
                >
                  <img src={images[photoIdx]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {/* Zoom icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <ZoomIn size={32} style={{ color: '#fff' }} />
                  </div>
                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setPhotoIdx(prev => (prev - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setPhotoIdx(prev => (prev + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                        {images.map((_: string, i: number) => (
                          <button key={i} onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transform: i === photoIdx ? 'scale(1.3)' : 'scale(1)' }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Thumbnail grid - clickable to open lightbox */}
                <div className="grid grid-cols-5 gap-1.5">
                  {images.map((src: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => openLightbox(idx)}
                      className="relative overflow-hidden rounded-lg transition-all cursor-pointer"
                      style={{
                        aspectRatio: '1',
                        border: idx === photoIdx ? '2px solid var(--blue-standard)' : '1px solid var(--border-light)',
                        opacity: idx === photoIdx ? 1 : 0.6,
                      }}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Footer */}
          <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg-gray-50)', borderTop: '1px solid var(--divider)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>共 {images.length} 张照片</span>
            <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--navy-deep)', color: '#fff' }}>关闭</button>
          </div>
        </div>

        {/* Lightbox overlay */}
        {lightboxOpen && (
          <ImageLightbox
            images={images}
            initialIdx={lightboxIdx}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </div>
    );
  }

  // ===== Album List View =====
  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center" style={{ pointerEvents: 'auto' }}>
      <div className="backdrop-modern absolute inset-0" onClick={onClose} />
      <div className="relative w-full dialog-modern animate-slide-up-elastic flex flex-col" style={{ maxHeight: '60vh', zIndex: 61 }}>
        <div className="gold-line" />
        {/* Header */}
        <div className="flex items-center px-4 py-3 flex-shrink-0" style={{ background: 'var(--navy-deep)' }}>
          <h2 className="flex-1 text-base font-bold text-white">校园风光</h2>
          <button onClick={onClose} className="p-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <X size={20} />
          </button>
        </div>
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4" style={{ background: '#fff' }}>
          <div className="grid grid-cols-3 gap-3">
            {ALBUMS.map(album => (
              <button
                key={album.id}
                onClick={() => { setSelectedAlbum(album); setPhotoIdx(0); }}
                className="flex flex-col rounded-xl overflow-hidden transition-all"
                style={{ border: '1px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center justify-center" style={{ aspectRatio: '4/3', background: 'var(--bg-gray-100)' }}>
                  {album.cover ? (
                    <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image size={28} style={{ color: 'var(--text-placeholder)' }} />
                  )}
                </div>
                <div className="px-2.5 py-2 text-left">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{album.title}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>共{album.images.length}张</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
