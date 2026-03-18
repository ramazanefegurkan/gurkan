import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from '@/src/api/client';
import {
  DocumentCategory,
  DocumentCategoryLabels,
  type DocumentCategoryType,
  type DocumentResponse,
} from '@/src/api/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/src/theme';

// ── Helpers ──────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Category badge colors ────────────────────────────

const categoryColors: Record<string, string> = {
  [DocumentCategory.TitleDeed]: '#1565c0',   // blue
  [DocumentCategory.Contract]: '#2e7d32',     // green
  [DocumentCategory.Insurance]: '#6a1b9a',    // purple
  [DocumentCategory.Invoice]: '#e65100',      // orange
  [DocumentCategory.Photo]: '#00838f',        // teal
  [DocumentCategory.Other]: '#757575',        // grey
};

// ── Document List Screen ─────────────────────────────

export default function DocumentsScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();

  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategoryType>(
    DocumentCategory.Other,
  );

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!propertyId) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.debug('[documents] fetching...');
      try {
        const data = await getDocuments(propertyId);
        setDocuments(data);
        console.debug('[documents] loaded', data.length, 'documents');
      } catch (err) {
        console.error('[documents] error', err);
        setError('Döküman listesi yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [propertyId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Upload ──

  const handleUpload = useCallback(async () => {
    if (!propertyId) return;

    console.debug('[documents] picking file...');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.debug('[documents] file pick cancelled');
        return;
      }

      const asset = result.assets[0];
      if (!asset) return;

      console.debug('[documents] uploading:', asset.name);
      setUploading(true);

      await uploadDocument(
        propertyId,
        asset.uri,
        asset.name,
        asset.mimeType ?? 'application/octet-stream',
        selectedCategory,
      );

      console.debug('[documents] uploaded successfully');
      await fetchData(true);
      Alert.alert('Başarılı', 'Döküman başarıyla yüklendi.');
    } catch (err) {
      console.error('[documents] upload error', err);
      Alert.alert('Hata', 'Döküman yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  }, [propertyId, selectedCategory, fetchData]);

  // ── Download ──

  const handleDownload = useCallback(
    async (doc: DocumentResponse) => {
      if (!propertyId) return;

      console.debug('[documents] downloading:', doc.id);
      setDownloadingId(doc.id);
      try {
        await downloadDocument(propertyId, doc.id, doc.originalFileName);
        console.debug('[documents] download complete');
      } catch (err) {
        console.error('[documents] download error', err);
        Alert.alert('Hata', 'Döküman indirilirken bir hata oluştu.');
      } finally {
        setDownloadingId(null);
      }
    },
    [propertyId],
  );

  // ── Delete ──

  const handleDelete = useCallback(
    (docId: string) => {
      if (!propertyId) return;
      Alert.alert(
        'Silme Onayı',
        'Bu dökümanı silmek istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              console.debug('[documents] deleting:', docId);
              try {
                await deleteDocument(propertyId, docId);
                console.debug('[documents] deleted');
                fetchData(true);
              } catch (err) {
                console.error('[documents] delete error', err);
                Alert.alert('Hata', 'Döküman silinirken bir hata oluştu.');
              }
            },
          },
        ],
      );
    },
    [propertyId, fetchData],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Dökümanlar' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Dökümanlar' }} />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color={colors.critical} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={() => fetchData()}
          >
            <MaterialIcons name="refresh" size={20} color={colors.textInverse} />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Dökümanlar' }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── Upload Section ── */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Döküman Yükle</Text>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {(
              Object.keys(DocumentCategory) as Array<
                keyof typeof DocumentCategory
              >
            ).map((key) => {
              const value = DocumentCategory[key];
              const label = DocumentCategoryLabels[value];
              const isSelected = selectedCategory === value;
              const chipColor = categoryColors[value] ?? colors.textTertiary;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.chip,
                    isSelected && {
                      backgroundColor: chipColor + '20',
                      borderColor: chipColor,
                    },
                  ]}
                  onPress={() => setSelectedCategory(value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: chipColor },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Upload Button */}
          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              pressed && styles.uploadButtonPressed,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <MaterialIcons
                name="cloud-upload"
                size={20}
                color={colors.textInverse}
              />
            )}
            <Text style={styles.uploadButtonText}>
              {uploading ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
            </Text>
          </Pressable>
        </View>

        {/* ── Document List ── */}
        {documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="folder-open"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyText}>Henüz döküman yüklenmemiş</Text>
            <Text style={styles.emptyHint}>
              Yukarıdan kategori seçip dosya yükleyebilirsiniz
            </Text>
          </View>
        ) : (
          documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isDownloading={downloadingId === doc.id}
              onDownload={() => handleDownload(doc)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

// ── Document Card Component ──────────────────────────

function DocumentCard({
  doc,
  isDownloading,
  onDownload,
  onDelete,
}: {
  doc: DocumentResponse;
  isDownloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const catColor =
    categoryColors[doc.category] ?? colors.textTertiary;
  const catLabel =
    DocumentCategoryLabels[doc.category as DocumentCategoryType] ??
    doc.category;

  // Truncate long filenames
  const displayName =
    doc.originalFileName.length > 40
      ? doc.originalFileName.slice(0, 37) + '...'
      : doc.originalFileName;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryBadgeText, { color: catColor }]}>
            {catLabel}
          </Text>
        </View>
        <Text style={styles.fileSizeText}>{formatFileSize(doc.fileSize)}</Text>
      </View>

      <Text style={styles.fileName} numberOfLines={2}>
        {displayName}
      </Text>

      <View style={styles.cardDateRow}>
        <MaterialIcons name="event" size={14} color={colors.textTertiary} />
        <Text style={styles.cardDateText}>
          {formatDate(doc.uploadedAt)}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {/* Download button */}
        <Pressable
          style={({ pressed }) => [
            styles.downloadButton,
            pressed && styles.downloadButtonPressed,
          ]}
          onPress={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.info} />
          ) : (
            <MaterialIcons name="file-download" size={20} color={colors.info} />
          )}
          <Text style={styles.downloadText}>
            {isDownloading ? 'İndiriliyor...' : 'İndir'}
          </Text>
        </Pressable>

        {/* Delete button */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={onDelete}
          hitSlop={8}
        >
          <MaterialIcons
            name="delete-outline"
            size={20}
            color={colors.critical}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  retryButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  retryButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textInverse,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Upload section
  uploadSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.caption,
    color: colors.textSecondary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  uploadButtonPressed: {
    backgroundColor: colors.accentDark,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.body,
    color: colors.textInverse,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.body,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
  },
  fileSizeText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
  fileName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardDateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.caption,
    color: colors.textTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.infoLight,
  },
  downloadButtonPressed: {
    opacity: 0.7,
  },
  downloadText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.size.caption,
    color: colors.info,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deleteButtonPressed: {
    backgroundColor: colors.criticalLight,
  },
});
