package collections

import (
    "encoding/csv"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sort"
    "strings"
    "time"

    "github.com/seedmanage/backend/internal/models"
)

// Store handles file-based storage for collections
type Store struct {
    dir string
}

// NewStore creates a new collections store
func NewStore(dir string) (*Store, error) {
    absDir, err := filepath.Abs(dir)
    if err != nil {
        return nil, fmt.Errorf("collections: invalid directory: %w", err)
    }
    if err := os.MkdirAll(absDir, 0755); err != nil {
        return nil, fmt.Errorf("collections: failed to create directory: %w", err)
    }
    return &Store{dir: absDir}, nil
}

// CollectionMeta is the metadata stored in each collection JSON file
type CollectionMeta struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"createdAt"`
    ItemCount int       `json:"itemCount"`
}

// CollectionFile is the on-disk format
type CollectionFile struct {
    Meta  CollectionMeta        `json:"meta"`
    Items []models.CollectionItem `json:"items"`
}

// List returns all collections with their metadata
func (s *Store) List() ([]CollectionMeta, error) {
    entries, err := os.ReadDir(s.dir)
    if err != nil {
        return nil, fmt.Errorf("collections: failed to list: %w", err)
    }

    var collections []CollectionMeta
    for _, entry := range entries {
        if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
            continue
        }
        meta, err := s.readMeta(entry.Name())
        if err != nil {
            continue
        }
        collections = append(collections, meta)
    }

    sort.Slice(collections, func(i, j int) bool {
        return collections[i].CreatedAt.After(collections[j].CreatedAt)
    })

    return collections, nil
}

// Get returns a single collection by ID (filename without .json)
func (s *Store) Get(id string) (*CollectionFile, error) {
    path := filepath.Join(s.dir, id+".json")
    data, err := os.ReadFile(path)
    if err != nil {
        if os.IsNotExist(err) {
            return nil, fmt.Errorf("collections: not found: %s", id)
        }
        return nil, fmt.Errorf("collections: failed to read: %w", err)
    }

    var cf CollectionFile
    if err := json.Unmarshal(data, &cf); err != nil {
        return nil, fmt.Errorf("collections: failed to parse: %w", err)
    }

    return &cf, nil
}

// Create creates a new empty collection
func (s *Store) Create(name string) (*CollectionMeta, error) {
    id := generateID(name)
    now := time.Now().UTC()

    cf := CollectionFile{
        Meta: CollectionMeta{
            ID:        id,
            Name:      name,
            CreatedAt: now,
            ItemCount: 0,
        },
        Items: []models.CollectionItem{},
    }

    if err := s.write(id, &cf); err != nil {
        return nil, err
    }

    return &cf.Meta, nil
}

// Delete removes a collection file
func (s *Store) Delete(id string) error {
    path := filepath.Join(s.dir, id+".json")
    if err := os.Remove(path); err != nil {
        if os.IsNotExist(err) {
            return fmt.Errorf("collections: not found: %s", id)
        }
        return fmt.Errorf("collections: failed to delete: %w", err)
    }
    return nil
}

// AddItem adds an item to a collection
func (s *Store) AddItem(collectionID string, item models.CollectionItem) (*models.CollectionItem, error) {
    cf, err := s.Get(collectionID)
    if err != nil {
        return nil, err
    }

    item.AddedAt = time.Now().UTC()
    cf.Items = append(cf.Items, item)
    cf.Meta.ItemCount = len(cf.Items)

    if err := s.write(collectionID, cf); err != nil {
        return nil, err
    }

    return &cf.Items[len(cf.Items)-1], nil
}

// AddItems appends multiple items to a collection
func (s *Store) AddItems(collectionID string, items []models.CollectionItem) ([]models.CollectionItem, error) {
    cf, err := s.Get(collectionID)
    if err != nil {
        return nil, err
    }

    now := time.Now().UTC()
    for i := range items {
        items[i].AddedAt = now
    }

    cf.Items = append(cf.Items, items...)
    cf.Meta.ItemCount = len(cf.Items)

    if err := s.write(collectionID, cf); err != nil {
        return nil, err
    }

    return items, nil
}

// DeleteItems removes items with specified magnets from a collection
func (s *Store) DeleteItems(collectionID string, magnets []string) error {
    cf, err := s.Get(collectionID)
    if err != nil {
        return err
    }

    magnetMap := make(map[string]bool)
    for _, m := range magnets {
        magnetMap[m] = true
    }

    var remainingItems []models.CollectionItem
    for _, item := range cf.Items {
        if !magnetMap[item.Magnet] {
            remainingItems = append(remainingItems, item)
        }
    }

    cf.Items = remainingItems
    cf.Meta.ItemCount = len(cf.Items)

    return s.write(collectionID, cf)
}

// ImportCSVToCollection parses a CSV and appends items to an existing collection
func (s *Store) ImportCSVToCollection(id string, csvContent string) ([]models.CollectionItem, error) {
    items, err := s.parseCSV(csvContent)
    if err != nil {
        return nil, err
    }

    return s.AddItems(id, items)
}

// ImportCSV parses a CSV file and creates a new collection from it
func (s *Store) ImportCSV(name string, csvContent string) (*CollectionMeta, error) {
    items, err := s.parseCSV(csvContent)
    if err != nil {
        return nil, err
    }

    id := generateID(name)
    now := time.Now().UTC()

    cf := CollectionFile{
        Meta: CollectionMeta{
            ID:        id,
            Name:      name,
            CreatedAt: now,
            ItemCount: len(items),
        },
        Items: items,
    }

    if err := s.write(id, &cf); err != nil {
        return nil, err
    }

    return &cf.Meta, nil
}

func (s *Store) parseCSV(csvContent string) ([]models.CollectionItem, error) {
    reader := csv.NewReader(strings.NewReader(csvContent))
    reader.FieldsPerRecord = -1 // allow variable number of fields
    reader.TrimLeadingSpace = true

    records, err := reader.ReadAll()
    if err != nil {
        return nil, fmt.Errorf("collections: failed to parse CSV: %w", err)
    }

    if len(records) == 0 {
        return nil, fmt.Errorf("collections: CSV file is empty")
    }

    // Check if first row looks like a header
    startIdx := 0
    if len(records) > 0 {
        first := records[0]
        lower := strings.ToLower(strings.TrimSpace(first[0]))
        if lower == "magnet" || lower == "magnet link" || lower == "magnetlink" {
            startIdx = 1
        }
    }

    var items []models.CollectionItem
    now := time.Now().UTC()
    for i := startIdx; i < len(records); i++ {
        row := records[i]
        if len(row) < 1 {
            continue
        }
        magnet := strings.TrimSpace(row[0])
        if magnet == "" {
            continue
        }

        keywords := ""
        if len(row) > 1 {
            keywords = strings.TrimSpace(row[1])
        }
        remarks := ""
        if len(row) > 2 {
            remarks = strings.TrimSpace(row[2])
        }

        // Use remarks as title if available, otherwise first few chars of magnet
        title := remarks
        if title == "" {
            title = magnet
            if len(title) > 60 {
                title = title[:60] + "..."
            }
        }

        items = append(items, models.CollectionItem{
            Magnet:   magnet,
            Keywords: keywords,
            Remarks:  remarks,
            Title:    title,
            Starred:  false,
            AddedAt:  now,
        })
    }

    if len(items) == 0 {
        return nil, fmt.Errorf("collections: no valid magnet links found in CSV")
    }

    return items, nil
}

func (s *Store) readMeta(filename string) (CollectionMeta, error) {
    path := filepath.Join(s.dir, filename)
    data, err := os.ReadFile(path)
    if err != nil {
        return CollectionMeta{}, err
    }

    var cf CollectionFile
    if err := json.Unmarshal(data, &cf); err != nil {
        return CollectionMeta{}, err
    }

    cf.Meta.ItemCount = len(cf.Items)
    return cf.Meta, nil
}

func (s *Store) write(id string, cf *CollectionFile) error {
    // Recalculate item count
    cf.Meta.ItemCount = len(cf.Items)

    data, err := json.MarshalIndent(cf, "", "  ")
    if err != nil {
        return fmt.Errorf("collections: failed to marshal: %w", err)
    }

    path := filepath.Join(s.dir, id+".json")
    if err := os.WriteFile(path, data, 0644); err != nil {
        return fmt.Errorf("collections: failed to write: %w", err)
    }

    return nil
}

func generateID(name string) string {
    now := time.Now().UnixNano()
    clean := strings.Map(func(r rune) rune {
        if r == ' ' || r == '_' || r == '-' {
            return '-'
        }
        if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' {
            return r
        }
        return -1
    }, strings.ToLower(name))
    if clean == "" {
        clean = "collection"
    }
    return fmt.Sprintf("%s-%d", clean, now)
}