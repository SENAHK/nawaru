import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { SectionList, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { ListItem } from '@/components/list-item';
import { Screen } from '@/components/screen';
import { db, schema } from '@/db/client';
import { categories } from '@/db/enums';
import { categoryLabels, schemeLabels } from '@/lib/labels';
import { categoryColors, space, useTheme } from '@/theme';

// First pass: the seeded library grouped by category. Search, filters and
// favourites come with the Library step.
export default function LibraryScreen() {
  const { colors } = useTheme();
  const { data } = useLiveQuery(
    db.select().from(schema.exercise).orderBy(asc(schema.exercise.name)),
  );

  const sections = categories
    .map((category) => ({
      category,
      data: data.filter((exercise) => exercise.category === category),
    }))
    .filter((section) => section.data.length > 0);

  return (
    <Screen title="Library">
      <SectionList
        sections={sections}
        keyExtractor={(exercise) => exercise.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AppText variant="label" color="textSecondary" style={styles.sectionHeader}>
            {categoryLabels[section.category]}
          </AppText>
        )}
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={schemeLabels[item.dosageScheme]}
            dotColor={categoryColors[item.category]}
            right={<ChevronRight size={20} strokeWidth={1.75} color={colors.textTertiary} />}
            onPress={() => router.push({ pathname: '/exercise/[exerciseId]', params: { exerciseId: item.id } })}
          />
        )}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { paddingTop: space[6], paddingBottom: space[2] },
  content: { paddingBottom: space[16] },
});
