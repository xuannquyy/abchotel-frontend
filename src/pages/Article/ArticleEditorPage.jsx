import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Form, Input, Select, Button, Typography, notification, Row, Col, Upload, Switch, Space, Divider, Image, Modal, List, Breadcrumb, Anchor, Dropdown } from 'antd';
import { ArrowLeft, FloppyDisk, ImageSquare, UploadSimple, Trash, Eye, MapPin, ListDashes, PlusCircle, Ticket, Bed, HandPointing } from '@phosphor-icons/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import ReactQuill, { Quill } from 'react-quill-new'; 
import 'react-quill-new/dist/quill.snow.css'; 

import { articleApi } from '../../api/articleApi';   
import { categoryApi } from '../../api/categoryApi'; 
import { mediaApi } from '../../api/mediaApi';
import { attractionApi } from '../../api/attractionApi'; 
import { roomTypeApi } from '../../api/roomTypeApi'; 
import { voucherApi } from '../../api/voucherApi'; 

// ==========================================
// MA THUẬT: ĐĂNG KÝ KHỐI CUSTOM CHO QUILL
// ==========================================
const BlockEmbed = Quill.import('blots/block/embed');
class CustomCardBlot extends BlockEmbed {
  static create(value) {
    let node = super.create();
    node.setAttribute('contenteditable', 'false');
    node.innerHTML = value;
    
    // 🔥 SỬ DỤNG MODAL CỦA ANT DESIGN THAY VÌ WINDOW.CONFIRM XẤU XÍ
    node.addEventListener('dblclick', function() {
      Modal.confirm({
        title: 'Xác nhận xóa tiện ích',
        content: 'Bạn có chắc chắn muốn xóa khối tiện ích này khỏi bài viết?',
        okText: 'Xóa ngay',
        okType: 'danger',
        cancelText: 'Hủy',
        centered: true,
        onOk() {
          node.remove(); // Xóa mượt mà khỏi khung soạn thảo
        }
      });
    });

    return node;
  }
  static value(node) { return node.innerHTML; }
}
CustomCardBlot.blotName = 'customCard';
CustomCardBlot.tagName = 'div';
CustomCardBlot.className = 'hotel-embedded-card';
Quill.register(CustomCardBlot, true);

const { Title, Text } = Typography;

const LUXURY_COLORS = {
    DARKEST: '#020C1B', NAVY: '#0A192F', MUTED_BLUE: '#3A506B', 
    LIGHT_BLUE: '#E6EBF1', LIGHTEST: '#F4F7FA', GOLD: '#D4AF37', 
    ACCENT_RED: '#8B0000', SUCCESS: '#1B5E20'
};

export default function ArticleEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const [searchParams] = useSearchParams();
  const prefillCategoryId = searchParams.get('category');

  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]); 
  const [vouchers, setVouchers] = useState([]); 
  
  const [content, setContent] = useState(''); 
  const [summaryContent, setSummaryContent] = useState(''); 
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [initialState, setInitialState] = useState({ isPublished: false, thumbnailUrl: null });

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ html: '', toc: [] });
  
  const [isAttractionModalOpen, setIsAttractionModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false); 
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false); 
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [currentMapUrl, setCurrentMapUrl] = useState('');

  // 🔥 2. HÀM BẮT SỰ KIỆN CLICK VÀO LINK TRONG HTML THÔ
  const handleContentClick = (e) => {
    const trigger = e.target.closest('.hotel-map-trigger'); // Tìm xem có click trúng cái class này không
    if (trigger) {
      e.preventDefault(); // Chặn hành vi chuyển trang mặc định
      const url = trigger.getAttribute('data-map-url');
      if (url) {
        setCurrentMapUrl(url);
        setMapModalOpen(true); // Mở Modal bản đồ
      }
    }
  };

  const reactQuillRef = useRef(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
          api.info({ message: 'Đang tải ảnh lên...', duration: 2 });
          const uploadRes = await mediaApi.uploadImage(file);
          const url = uploadRes.data?.url || uploadRes.url || uploadRes;
          const quill = reactQuillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
          quill.setSelection(range.index + 1);
        } catch (error) {
          api.error({ message: 'Lỗi', description: 'Tải ảnh thất bại.' });
        }
      }
    };
  };

  const fullModules = useMemo(() => ({
    table: true,
    keyboard: { bindings: { 'list autofill': null } },
    toolbar: {
      container: [
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], 
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }], 
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }], 
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'], 
        ['table'], 
        ['link', 'image', 'video'], 
        ['clean'] 
      ],
      handlers: { image: imageHandler }
    }
  }), []);

  const miniModules = useMemo(() => ({
    toolbar: [ ['bold', 'italic', 'underline'], [{ 'list': 'bullet' }], ['clean'] ]
  }), []);

  useEffect(() => {
    categoryApi.getCategories(true).then(res => setCategories(res || []));
    attractionApi.getAttractions(true).then(res => setAttractions(res || []));
    roomTypeApi.getRoomTypes(true).then(res => setRoomTypes(res || [])); 
    try { voucherApi.getAll(true).then(res => setVouchers(res?.data || res || [])); } catch(e){}

    if (id) {
      setLoading(true);
      articleApi.getArticles(false).then(async res => {
        const items = res.items || res;
        const articleToEdit = items.find(a => a.id.toString() === id);
        if (articleToEdit) {
          const isPub = articleToEdit.publishedAt != null;
          form.setFieldsValue({ title: articleToEdit.title, categoryId: articleToEdit.categoryId, isPublished: isPub });
          setThumbnailUrl(articleToEdit.thumbnailUrl);
          setInitialState({ isPublished: isPub, thumbnailUrl: articleToEdit.thumbnailUrl });
          try {
             if(articleToEdit.slug) {
                const detail = await articleApi.getArticleBySlug(articleToEdit.slug);
                setContent(detail.content || '');
                setSummaryContent(detail.shortDescription || ''); 
             }
          } catch(e) {}
        }
        setLoading(false);
      });
    } else if (prefillCategoryId) {
      form.setFieldsValue({ categoryId: parseInt(prefillCategoryId) });
    }
  }, [id, prefillCategoryId, form]);

  const handleUploadThumbnail = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      setThumbnailUrl(uploadRes.data?.url || uploadRes.url || uploadRes);
      onSuccess("ok");
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Tải ảnh bìa thất bại.' });
      onError(error);
    } finally { setLoading(false); }
  };

  const handleSaveArticle = async (values) => {
    try {
      setLoading(true);
      const currentContent = reactQuillRef.current ? reactQuillRef.current.getEditor().root.innerHTML : content;
      const payload = { 
        categoryId: values.categoryId, title: values.title || "",
        shortDescription: summaryContent || "", content: currentContent === '<p><br></p>' ? '' : currentContent,
        metaTitle: values.title || "", metaDescription: summaryContent ? summaryContent.replace(/<[^>]*>?/gm, '').substring(0, 150) : "" 
      }; 

      if (!payload.title || !payload.categoryId) {
          api.warning({ message: 'Cảnh báo', description: 'Vui lòng nhập đủ Tiêu đề và Danh mục.' });
          setLoading(false); return;
      }

      let articleId = id;
      if (id) await articleApi.updateArticle(id, payload); 
      else {
        const res = await articleApi.createArticle(payload); 
        articleId = res.articleId || res.data?.articleId || res.id;
      }

      if (articleId && thumbnailUrl !== initialState.thumbnailUrl) {
        try { await articleApi.updateThumbnail(articleId, { thumbnailUrl: thumbnailUrl || "" }); } catch(e) {}
      }

      if (articleId && values.isPublished !== initialState.isPublished) {
        try { await articleApi.togglePublish(articleId); } catch(e) {}
      }

      api.success({ message: 'Thành công', description: 'Đã lưu bài viết.' });
      setTimeout(() => navigate(payload.categoryId ? `/admin/articles?category=${payload.categoryId}` : '/admin/articles'), 1000);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể lưu bài viết.' });
    } finally { setLoading(false); }
  };

  const generatePreview = () => {
    const currentTitle = form.getFieldValue('title') || 'Chưa có tiêu đề';
    const currentCatId = form.getFieldValue('categoryId');
    const categoryName = categories.find(c => c.id === currentCatId)?.name || 'Chưa phân loại';
    const currentHTML = reactQuillRef.current ? reactQuillRef.current.getEditor().root.innerHTML : content;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHTML, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    
    const tocData = [];
    headings.forEach((h, index) => {
        const idId = `heading-${index}`; h.id = idId; 
        tocData.push({ key: idId, href: `#${idId}`, title: h.innerText, level: h.tagName.toLowerCase() === 'h2' ? 0 : 1 });
    });

    setPreviewData({ title: currentTitle, category: categoryName, html: doc.body.innerHTML, toc: tocData });
    setIsPreviewModalOpen(true);
  };

  const insertHtmlToQuill = (htmlContent) => {
    const quill = reactQuillRef.current.getEditor();
    quill.focus();
    const range = quill.getSelection() || { index: quill.getLength() };
    quill.insertEmbed(range.index, 'customCard', htmlContent);
    setTimeout(() => quill.setSelection(range.index + 1), 100);
  };

  // 1. ĐIỂM DU LỊCH (Đã fix lỗi click và link nhúng Google Maps)
  const handleInsertAttraction = (attr) => {
    const mapQuery = encodeURIComponent((attr.name + " " + (attr.address || "")).trim());
    const embedMapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    const html = `
      <div style="margin: 24px auto; width: 100%; max-width: 480px; box-sizing: border-box; display: flex; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: inherit; align-items: stretch;">
        <div style="background: #0A192F; color: #ffffff; padding: 24px 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 100px; border-right: 1px dashed #cbd5e1;">
           <div style="font-size: 24px; line-height: 1; margin-bottom: 8px; color: #ef4444;">📍</div>
           <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Điểm đến</div>
        </div>
        <div style="padding: 16px 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
           <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Cách khách sạn ${attr.distanceKm} km</div>
           <div style="font-size: 18px; font-weight: 800; color: #0A192F; margin-bottom: 6px; line-height: 1.3;">${attr.name}</div>
           <div style="font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.4;">${attr.address || 'Đang cập nhật địa chỉ'}</div>
           <div>
              <a href="#map-popup" class="hotel-map-trigger" data-map-url="${embedMapUrl}" style="display: inline-block; font-size: 12px; font-weight: 800; color: #8B0000; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">Xem bản đồ ⟶</a>
           </div>
        </div>
      </div>
    `;
    insertHtmlToQuill(html);
    setIsAttractionModalOpen(false);
  };

  const handleInsertRoom = (room) => {
    const safePrice = room.price || room.basePricePerNight || room.defaultPrice || room.basePrice || 0;
    const priceNight = safePrice > 0 ? new Intl.NumberFormat('vi-VN').format(safePrice) : 'Liên hệ';
    const coverImg = room.images?.find(i => i.isPrimary)?.imageUrl || room.images?.[0]?.imageUrl || 'https://via.placeholder.com/300x200?text=Room';
    const shortDesc = room.description ? (room.description.length > 70 ? room.description.substring(0, 70) + '...' : room.description) : 'Trải nghiệm không gian nghỉ dưỡng sang trọng.';

    const html = `
      <div style="margin: 24px auto; width: 100%; max-width: 480px; box-sizing: border-box; display: flex; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; font-family: inherit; align-items: stretch;">
        <div style="width: 140px; min-width: 140px; flex-shrink: 0; background: #f8fafc; display: flex; flex-direction: column;">
           <img src="${coverImg}" style="width: 100%; flex: 1; object-fit: cover; display: block; margin: 0;" alt="${room.name}"/>
        </div>
        <div style="padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
           <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Hạng phòng</div>
           <div style="font-size: 18px; font-weight: 800; color: #0A192F; margin-bottom: 6px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${room.name}</div>
           <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${shortDesc}</div>
           <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto;">
              <div>
                  <span style="font-size: 18px; font-weight: 900; color: #8B0000; line-height: 1;">${priceNight}đ</span><span style="font-size: 11px; color: #64748b; font-weight: 600; margin-left: 2px;">/đêm</span>
              </div>
              <a href="#booking" style="background: #0A192F; color: #ffffff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Đặt ngay</a>
           </div>
        </div>
      </div>
    `;
    insertHtmlToQuill(html);
    setIsRoomModalOpen(false);
  };

  const handleInsertVoucher = (voucher) => {
    const isPercent = voucher.discountType === 'PERCENT' || voucher.discountPercent;
    const value = voucher.discountValue || voucher.discountPercent || 0;
    const displayValue = isPercent ? `${value}%` : `${new Intl.NumberFormat('vi-VN').format(value)}đ`;

    const html = `
      <div style="margin: 24px auto; width: 100%; max-width: 480px; box-sizing: border-box; display: flex; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(139, 0, 0, 0.08); border: 1px dashed #fca5a5; font-family: inherit;">
        <div style="background: linear-gradient(135deg, #8B0000 0%, #5c0000 100%); color: #ffffff; padding: 24px 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 120px; position: relative;">
           <span style="font-size: 28px; font-weight: 900; line-height: 1;">${displayValue}</span>
           <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; opacity: 0.9;">GIẢM GIÁ</span>
           <div style="position: absolute; right: -10px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; background: #ffffff; border-radius: 50%; border-left: 1px dashed #fca5a5;"></div>
        </div>
        <div style="padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: center; background: #ffffff; box-sizing: border-box;">
           <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Mã Khuyến Mãi</h4>
           <div style="font-size: 24px; font-weight: 900; color: #0A192F; margin-bottom: 8px; letter-spacing: 1px;">${voucher.code}</div>
           <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">${voucher.description || 'Sử dụng mã này tại bước thanh toán để nhận ưu đãi đặc biệt.'}</p>
           <a href="#booking" style="display: inline-block; font-size: 13px; font-weight: bold; color: #8B0000; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">Sử dụng ngay ⟶</a>
        </div>
      </div>
    `;
    insertHtmlToQuill(html);
    setIsVoucherModalOpen(false);
  };

  // 🔥 ĐÃ VÁ LỖI NÚT ĐẶT PHÒNG: Ép cứng height, bỏ padding dọc để chống bị vỡ
  const handleInsertButton = () => {

    const html = `

      <div style="margin: 32px auto; text-align: center; width: 100%; box-sizing: border-box; font-family: inherit;">

         <a href="#booking" style="display: inline-block; padding: 14px 48px; background: linear-gradient(135deg, #D4AF37 0%, #aa771c 100%); color: #ffffff; text-decoration: none; border-radius: 30px; font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);">ĐẶT PHÒNG NGAY</a>

      </div>

    `;

    insertHtmlToQuill(html);

  };
  const insertMenu = {
    items: [
      { key: '1', icon: <MapPin size={18} />, label: 'Điểm Du Lịch', onClick: () => setIsAttractionModalOpen(true) },
      { key: '2', icon: <Bed size={18} />, label: 'Hạng Phòng', onClick: () => setIsRoomModalOpen(true) },
      { key: '3', icon: <Ticket size={18} />, label: 'Mã Giảm Giá', onClick: () => setIsVoucherModalOpen(true) },
      { type: 'divider' },
      { key: '4', icon: <HandPointing size={18} />, label: 'Nút Đặt Ngay', onClick: handleInsertButton },
    ]
  };

  return (
    <div style={{ paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      {contextHolder}
      
      <style>{`
        .ql-editor { 
            font-family: "Source Serif 4", Georgia, serif !important; 
            font-size: 18px !important; line-height: 1.8 !important; color: #1e293b !important; 
            min-height: 500px; padding: 24px 32px !important;
        }
        .ql-editor h2 { font-size: 28px; color: #0f172a; margin-top: 32px; margin-bottom: 16px; font-weight: 700; }
        .ql-editor h3 { font-size: 22px; color: #334155; margin-top: 24px; margin-bottom: 12px; font-weight: 600; }
        .ql-editor img { border-radius: 8px; margin: 24px 0; max-width: 100%; height: auto; display: block; }
        .ql-editor table { border-collapse: collapse; width: 100%; margin: 24px 0; font-size: 15px !important; }
        .ql-editor table td, .ql-editor table th { border: 1px solid #cbd5e1; padding: 12px; }
        
        /* CHỐNG VỠ KHUNG TRONG QUILL */
        .hotel-embedded-card { display: block; cursor: default; transition: opacity 0.2s ease; width: 100%; box-sizing: border-box; position: relative; }
        .hotel-embedded-card > div { width: 100%; margin-left: auto; margin-right: auto; }
        .hotel-embedded-card > div { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        
        /* HIỆU ỨNG CẢNH BÁO KHI RÊ CHUỘT VÀO ĐỂ XÓA */
        .hotel-embedded-card:hover {
            box-shadow: 0 0 0 2px #ef4444; border-radius: 8px;
        }
        .hotel-embedded-card:hover::after {
            content: "Nhấp đúp (Double-click) để xóa";
            position: absolute; top: -25px; right: 10px; background: #ef4444; color: #fff;
            padding: 4px 10px; font-size: 12px; border-radius: 6px; font-weight: bold;
            pointer-events: none; z-index: 10; font-family: sans-serif;
        }

        .ql-toolbar.ql-snow {
            position: sticky; top: 0; z-index: 100;
            background: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 12px; border-color: #cbd5e1;
        }
        .ql-container.ql-snow { border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-color: #cbd5e1; }
        .summary-quill .ql-editor { min-height: 120px !important; font-size: 16px !important; background: #f8fafc; padding: 16px !important; }
        .summary-quill .ql-toolbar.ql-snow { position: static; background: #f1f5f9; box-shadow: none; border-radius: 8px 8px 0 0; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeft size={24} />} onClick={() => navigate(prefillCategoryId ? `/admin/articles?category=${prefillCategoryId}` : '/admin/articles')} />
          <Title level={3} style={{ margin: 0, color: LUXURY_COLORS.NAVY, fontFamily: '"Source Serif 4", serif' }}>
            {id ? 'Chỉnh sửa Bài viết' : 'Soạn thảo Bài viết mới'}
          </Title>
        </Space>
        <Space>
          <Button size="large" onClick={generatePreview} icon={<Eye size={20} />} style={{ fontWeight: 600 }}>Xem thử</Button>
          <Button type="primary" size="large" onClick={() => form.submit()} loading={loading} icon={<FloppyDisk size={20} />} style={{ backgroundColor: LUXURY_COLORS.NAVY, fontWeight: 'bold' }}>LƯU BÀI VIẾT</Button>
        </Space>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSaveArticle} initialValues={{ isPublished: false }}>
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <Form.Item name="title" label={<Text strong>Tiêu đề bài viết</Text>} rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                <Input size="large" placeholder="Nhập tiêu đề..." style={{ fontSize: 20, fontWeight: 700, color: LUXURY_COLORS.DARKEST, fontFamily: '"Source Serif 4", serif' }} />
              </Form.Item>
              <div style={{ marginBottom: 24 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Tóm tắt (Sẽ xuất hiện ngoài trang chủ)</Text>
                <div className="summary-quill">
                    <ReactQuill theme="snow" value={summaryContent} onChange={setSummaryContent} modules={miniModules} placeholder="Đoạn văn ngắn gây tò mò..." />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Nội dung bài viết</Text>
                <div className="editor-wrapper" onClick={handleContentClick}>
                    <ReactQuill ref={reactQuillRef} theme="snow" value={content} onChange={setContent} modules={fullModules} placeholder="Bắt đầu viết nội dung..." />
                </div>
              </div>
            </Card>
          </Col>

          {/* CỘT BÊN PHẢI STICKY */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 24 }}>
                
                <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>
                  <Form.Item name="isPublished" label={<Text strong>Trạng thái hiển thị</Text>} valuePropName="checked" style={{ marginBottom: 16 }}>
                    <Switch checkedChildren="Xuất bản" unCheckedChildren="Bản nháp" />
                  </Form.Item>
                  <Form.Item name="categoryId" label={<Text strong>Thuộc Danh mục</Text>} rules={[{ required: true, message: 'Chọn danh mục' }]} style={{ marginBottom: 0 }}>
                    <Select size="large" placeholder="Chọn...">{categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}</Select>
                  </Form.Item>
                </Card>

                <Card title={<Text strong>Ảnh đại diện (Thumbnail)</Text>} variant="borderless" style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: '#fff' }}>
                  {thumbnailUrl ? (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
                        <Image src={thumbnailUrl} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 4 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Upload customRequest={handleUploadThumbnail} showUploadList={false} accept="image/*" style={{ flex: 1 }}>
                              <Button block icon={<UploadSimple />}>Đổi ảnh</Button>
                            </Upload>
                            <Button danger icon={<Trash />} onClick={() => setThumbnailUrl(null)} />
                        </div>
                      </div>
                  ) : (
                      <Upload customRequest={handleUploadThumbnail} showUploadList={false} accept="image/*">
                        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: '30px 20px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', width: '100%' }}>
                            <ImageSquare size={32} color="#94a3b8" /><div style={{ marginTop: 8 }}><Text type="secondary">Tải ảnh lên</Text></div>
                        </div>
                      </Upload>
                  )}
                </Card>

                {/* KHỐI CHÈN TIỆN ÍCH */}
                <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 8px 20px rgba(139, 0, 0, 0.08)', background: 'linear-gradient(135deg, #ffffff 0%, #fff5f5 100%)', border: `1px solid ${LUXURY_COLORS.ACCENT_RED}` }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ background: '#fca5a5', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            <PlusCircle size={24} color={LUXURY_COLORS.ACCENT_RED} weight="fill" />
                        </div>
                        <Title level={5} style={{ color: LUXURY_COLORS.ACCENT_RED, marginTop: 0, marginBottom: 8 }}>Chèn Tiện Ích</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>
                            Làm phong phú bài viết của bạn với thẻ hạng phòng, điểm du lịch, và mã khuyến mãi.
                        </Text>
                        <Dropdown menu={insertMenu} trigger={['click']} placement="bottomCenter">
                            <Button type="primary" size="large" block style={{ backgroundColor: LUXURY_COLORS.ACCENT_RED, fontWeight: 'bold', borderRadius: 8, height: 45, letterSpacing: 1 }}>
                                CHỌN TIỆN ÍCH
                            </Button>
                        </Dropdown>
                    </div>
                </Card>

            </div>
          </Col>
        </Row>
      </Form>

      {/* MODALS */}
      <Modal open={isPreviewModalOpen} onCancel={() => setIsPreviewModalOpen(false)} footer={null} width={1000} closeIcon={false} styles={{ body: { padding: 0 } }}>
         <div style={{ background: LUXURY_COLORS.NAVY, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px 8px 0 0' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Xem trước bài viết</Text>
            <Button onClick={() => setIsPreviewModalOpen(false)}>Đóng</Button>
         </div>
         <div style={{ padding: '32px 24px', background: '#f1f5f9' }}>
            <Card variant="borderless" style={{ maxWidth: 850, margin: '0 auto', borderRadius: 12, padding: '32px 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <Title level={1} style={{ color: '#0f172a', marginTop: 0, fontFamily: '"Source Serif 4", serif', fontSize: 32, fontWeight: 700 }}>{previewData.title}</Title>
                <div style={{ fontStyle: 'italic', color: '#475569', borderLeft: `4px solid ${LUXURY_COLORS.NAVY}`, paddingLeft: 20, fontSize: 18, lineHeight: 1.6, marginBottom: 32 }} dangerouslySetInnerHTML={{ __html: summaryContent }} />
                {thumbnailUrl && <img src={thumbnailUrl} alt="cover" style={{ width: '100%', borderRadius: 8, marginBottom: 32, maxHeight: 400, objectFit: 'cover' }} />}
                <Row gutter={40}>
                    <Col xs={24} md={16}>
                        <div className="ql-editor" style={{ padding: 0 }} dangerouslySetInnerHTML={{ __html: previewData.html }} onClick={handleContentClick} />
                    </Col>
                    <Col xs={0} md={8}>
                        {previewData.toc.length > 0 && (
                            <div style={{ position: 'sticky', top: 24, background: '#f8fafc', padding: '20px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <Text strong style={{ display: 'block', marginBottom: 16, color: '#0f172a', fontSize: 15, textTransform: 'uppercase' }}><ListDashes style={{verticalAlign:'middle'}}/> MỤC LỤC</Text>
                                <Anchor affix={false} showInkInFixed items={previewData.toc.map(t => ({ key: t.key, href: t.href, title: <span style={{ marginLeft: t.level * 16, fontSize: 14 }}>{t.title}</span> }))}/>
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>
         </div>
      </Modal>

      <Modal title="Chọn Điểm Du Lịch" open={isAttractionModalOpen} onCancel={() => setIsAttractionModalOpen(false)} footer={null}>
         <List itemLayout="horizontal" dataSource={attractions} renderItem={item => (<List.Item actions={[<Button type="primary" size="small" onClick={() => handleInsertAttraction(item)} style={{backgroundColor: LUXURY_COLORS.NAVY, fontWeight: 'bold'}}>Chèn</Button>]}><List.Item.Meta title={<Text strong>{item.name}</Text>} description={<Text type="secondary">{item.distanceKm}km</Text>} /></List.Item>)} />
      </Modal>

      <Modal title="Chọn Hạng Phòng" open={isRoomModalOpen} onCancel={() => setIsRoomModalOpen(false)} footer={null} width={600}>
         <List itemLayout="horizontal" dataSource={roomTypes} renderItem={room => {
              const safePrice = room.price || room.basePricePerNight || room.defaultPrice || room.basePrice || 0;
              const coverImg = room.images?.find(i => i.isPrimary)?.imageUrl || room.images?.[0]?.imageUrl;
              return (<List.Item actions={[<Button type="primary" size="small" onClick={() => handleInsertRoom(room)} style={{backgroundColor: LUXURY_COLORS.NAVY, fontWeight: 'bold'}}>Chèn</Button>]}><List.Item.Meta avatar={coverImg ? <img src={coverImg} style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4}} alt="room" /> : <div style={{width: 60, height: 60, background: '#eee', borderRadius: 4}}/>} title={<Text strong>{room.name}</Text>} description={<Text type="secondary">{new Intl.NumberFormat('vi-VN').format(safePrice)}đ</Text>} /></List.Item>)
         }} />
      </Modal>

      <Modal title="Chọn Mã Giảm Giá" open={isVoucherModalOpen} onCancel={() => setIsVoucherModalOpen(false)} footer={null}>
         <List itemLayout="horizontal" dataSource={vouchers} renderItem={voucher => (
              <List.Item actions={[<Button type="primary" size="small" onClick={() => handleInsertVoucher(voucher)} style={{backgroundColor: LUXURY_COLORS.ACCENT_RED, fontWeight: 'bold'}}>Chèn</Button>]}>
                <List.Item.Meta title={<Text strong style={{color: LUXURY_COLORS.ACCENT_RED}}>{voucher.code}</Text>} description={<Text type="secondary">{voucher.description}</Text>} />
              </List.Item>
            )} />
      </Modal>
      {/* 🔥 MODAL POPUP BẢN ĐỒ 🔥 */}
      <Modal 
        title={<span style={{ color: LUXURY_COLORS.NAVY, fontWeight: 800, fontSize: 18 }}>📍 Bản đồ địa điểm</span>} 
        open={mapModalOpen} 
        onCancel={() => setMapModalOpen(false)} 
        footer={null} 
        width={800} 
        centered
        destroyOnClose
        styles={{ body: { padding: '16px 0 0 0' } }}
      >
        <div style={{ width: '100%', height: '450px', background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
              src={currentMapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </Modal>
    </div>
  );
}