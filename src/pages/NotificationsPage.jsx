import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Typography, Button, Space, Tabs, Badge, notification } from 'antd';
import { BellRinging, CheckCircle, EnvelopeOpen } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import relativeTime from 'dayjs/plugin/relativeTime';
import { notificationApi } from '../api/notificationApi'; 
import { useSignalR } from '../hooks/useSignalR';

dayjs.locale('vi');
const { Title, Text, Paragraph } = Typography;

const THEME = { NAVY_DARK: '#0D1821', DARK_RED: '#8A1538', BG_LIGHT: '#F8FAFC' };

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Gọi api: GET /api/Notifications
            const res = await notificationApi.getMyNotifications(); 
            setNotifications(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    useSignalR(() => { fetchNotifications(); }); // Có thông báo mới là load lại danh sách

    const handleMarkAsRead = async (id) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {}
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            fetchNotifications();
        } catch (error) {}
    };

    const filteredNotifs = activeTab === 'all' ? notifications : notifications.filter(n => !n.isRead);

    return (
        <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, color: THEME.NAVY_DARK }}><BellRinging /> Hộp thư thông báo</Title>
                <Button type="primary" icon={<CheckCircle />} onClick={handleMarkAllAsRead} style={{ backgroundColor: THEME.DARK_RED }}>
                    Đánh dấu tất cả đã đọc
                </Button>
            </div>

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                items={[
                    { key: 'all', label: `Tất cả (${notifications.length})` },
                    { key: 'unread', label: <Badge count={notifications.filter(n => !n.isRead).length} offset={[10, 0]}>Chưa đọc</Badge> }
                ]}
            />

            <List
                loading={loading}
                itemLayout="horizontal"
                dataSource={filteredNotifs}
                renderItem={item => (
                    <List.Item 
                        onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                        style={{ 
                            padding: '16px 24px', cursor: 'pointer', borderRadius: 12, marginBottom: 8,
                            backgroundColor: item.isRead ? '#ffffff' : '#f0f5ff',
                            border: item.isRead ? '1px solid #f0f0f0' : `1px solid #bae0ff`,
                            transition: 'all 0.3s'
                        }}
                    >
                        <List.Item.Meta
                            avatar={
                                <Avatar 
                                    size={48} 
                                    icon={item.isRead ? <EnvelopeOpen /> : <BellRinging weight="fill" />} 
                                    style={{ backgroundColor: item.isRead ? '#f5f5f5' : '#ffe8eb', color: item.isRead ? '#bfbfbf' : THEME.DARK_RED }} 
                                />
                            }
                            title={
                                <Space>
                                    <Text strong style={{ fontSize: 16, color: item.isRead ? '#8c8c8c' : THEME.NAVY_DARK }}>{item.title}</Text>
                                    {!item.isRead && <Badge status="processing" color={THEME.DARK_RED} />}
                                </Space>
                            }
                            description={
                                <div>
                                    <Paragraph style={{ margin: '4px 0', color: item.isRead ? '#bfbfbf' : '#475569', fontSize: 14 }}>{item.content}</Paragraph>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdAt).format('HH:mm - DD/MM/YYYY')}</Text>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
}