// frontend/js/i18n.js
// Full translations for all 3 languages

const TRANSLATIONS = {
  lv: {
    // Nav
    nav_home: 'Sākums',
    nav_catalog: 'Katalogs',
    nav_upload: 'Augšupielādēt',
    nav_library: 'Mana Bibliotēka',
    nav_history: 'Vēsture',
    nav_profile: 'Profils',
    nav_admin: 'Administrācija',
    nav_login: 'Pieteikties',
    nav_register: 'Reģistrēties',
    nav_logout: 'Iziet',
    nav_my_books: 'Manas Grāmatas',

    // Hero
    hero_title: 'Klausies. Veido. Dalies.',
    hero_subtitle: 'Atrodi savu nākamo mīļāko grāmatu — audiogrāmatas visās pasaules valodās un visām gaumēm.',
    hero_cta_browse: 'Skatīt Katalogs',
    hero_cta_upload: 'Augšupielādēt Grāmatu',

    // Home sections
    popular_books: 'Populārākās Grāmatas',
    new_books: 'Jaunākās Grāmatas',
    by_genre: 'Pēc Žanra',
    see_all: 'Skatīt visas',

    // Catalog
    catalog_title: 'Audiogrāmatu Katalogs',
    search_placeholder: 'Meklēt pēc nosaukuma vai autora...',
    filter_genre: 'Žanrs',
    filter_language: 'Valoda',
    filter_rating: 'Min. vērtējums',
    filter_duration: 'Maks. ilgums (min)',
    sort_by: 'Kārtot pēc',
    sort_popular: 'Popularitātes',
    sort_rating: 'Vērtējuma',
    sort_newest: 'Jaunāko',
    sort_title: 'Nosaukuma',
    all_genres: 'Visi žanri',
    all_languages: 'Visas valodas',
    no_books: 'Grāmatas nav atrastas',
    loading: 'Ielādē...',

    // Book card / page
    listen: 'Klausīties',
    download: 'Lejupielādēt',
    reviews: 'Atsauksmes',
    no_reviews: 'Pagaidām nav atsauksmju',
    write_review: 'Rakstīt Atsauksmi',
    your_rating: 'Jūsu vērtējums',
    your_comment: 'Komentārs (neobligāts)',
    submit_review: 'Publicēt Atsauksmi',
    duration: 'Ilgums',
    published: 'Publicēts',
    genre: 'Žanrs',
    language: 'Valoda',
    parts: 'Daļas',
    author: 'Autors',
    listeners: 'Klausītāji',
    rating: 'Vērtējums',

    // Player
    player_speed: 'Ātrums',
    player_part: 'Daļa',
    player_now_playing: 'Tiek atskaņots',

    // Auth
    login_title: 'Pieteikties',
    register_title: 'Reģistrēties',
    email: 'E-pasts',
    username: 'Lietotājvārds',
    password: 'Parole',
    confirm_password: 'Atkārtot Paroli',
    login_btn: 'Pieteikties',
    register_btn: 'Reģistrēties',
    no_account: 'Nav konta?',
    have_account: 'Jau ir konts?',
    forgot_password: 'Aizmirsi paroli?',

    // Upload
    upload_title: 'Augšupielādēt Audiogrāmatu',
    book_title: 'Grāmatas Nosaukums',
    book_description: 'Apraksts',
    book_cover: 'Vāka Attēls',
    audio_files: 'Audiofaili',
    add_part: 'Pievienot Daļu',
    part_title_label: 'Daļas Nosaukums',
    visibility_public: 'Publiski',
    visibility_private: 'Privāti',
    publish_btn: 'Publicēt',

    // Profile
    profile_title: 'Mans Profils',
    edit_profile: 'Rediģēt Profilu',
    change_password: 'Mainīt Paroli',
    current_password: 'Pašreizējā parole',
    change_password_btn: 'Mainīt paroli',
    generate_password: 'Ģenerēt',
    bio_placeholder: 'Pastāstiet par sevi...',
    save_changes: 'Saglabāt',
    cancel: 'Atcelt',
    books_listened: 'Noklausītas grāmatas',
    hours_listened: 'Stundas',
    books_published_stat: 'Publicētas grāmatas',

    // History
    history_title: 'Klausīšanās Vēsture',
    clear_history: 'Dzēst Vēsturi',
    continue_listening: 'Turpināt Klausīties',
    completed: 'Pabeigts',
    in_progress: 'Procesā',

    // Admin
    admin_title: 'Administrācijas Panelis',
    admin_users: 'Lietotāji',
    admin_books: 'Grāmatas',
    admin_reviews: 'Atsauksmes',
    admin_modlog: 'Moderācijas Žurnāls',
    admin_stats: 'Statistika',
    total_users: 'Kopā Lietotāji',
    total_books: 'Kopā Grāmatas',
    total_reviews: 'Kopā Atsauksmes',
    block_user: 'Bloķēt',
    unblock_user: 'Atbloķēt',
    delete_user: 'Dzēst',
    change_role: 'Mainīt Lomu',
    block_reason: 'Bloķēšanas Iemesls',
    confirm_delete: 'Vai tiešām dzēst?',

    // Roles
    role_user: 'Lietotājs',
    role_moderator: 'Moderators',
    role_admin: 'Administrators',

    // Errors / Messages
    error_required: 'Šis lauks ir obligāts',
    error_email: 'Nederīgs e-pasts',
    error_password_short: 'Parole par īsu (min. 8 simboli)',
    error_password_match: 'Paroles nesakrīt',
    success_login: 'Veiksmīgi pieteicies!',
    success_register: 'Konts izveidots!',
    success_upload: 'Grāmata augšupielādēta!',
    success_review: 'Atsauksme publicēta!',
    login_required: 'Lūdzu pieteikties',
    not_found: 'Nav atrasts',

    // UI
    interface_language: 'Valoda',
    close: 'Aizvērt',
    delete: 'Dzēst',
    edit: 'Rediģēt',
    confirm: 'Apstiprināt',
    search: 'Meklēt',
  },

  ru: {
    nav_home: 'Главная',
    nav_catalog: 'Каталог',
    nav_upload: 'Загрузить',
    nav_library: 'Моя Библиотека',
    nav_history: 'История',
    nav_profile: 'Профиль',
    nav_admin: 'Администрация',
    nav_login: 'Войти',
    nav_register: 'Регистрация',
    nav_logout: 'Выйти',
    nav_my_books: 'Мои Книги',

    hero_title: 'Слушай. Создавай. Делись.',
    hero_subtitle: 'Найди свою следующую любимую книгу — аудиокниги на всех языках мира и на любой вкус.',
    hero_cta_browse: 'Смотреть Каталог',
    hero_cta_upload: 'Загрузить Книгу',

    popular_books: 'Популярные Книги',
    new_books: 'Новинки',
    by_genre: 'По Жанрам',
    see_all: 'Смотреть все',

    catalog_title: 'Каталог Аудиокниг',
    search_placeholder: 'Поиск по названию или автору...',
    filter_genre: 'Жанр',
    filter_language: 'Язык',
    filter_rating: 'Мин. рейтинг',
    filter_duration: 'Макс. длительность (мин)',
    sort_by: 'Сортировать по',
    sort_popular: 'Популярности',
    sort_rating: 'Рейтингу',
    sort_newest: 'Новизне',
    sort_title: 'Названию',
    all_genres: 'Все жанры',
    all_languages: 'Все языки',
    no_books: 'Книги не найдены',
    loading: 'Загрузка...',

    listen: 'Слушать',
    download: 'Скачать',
    reviews: 'Отзывы',
    no_reviews: 'Отзывов пока нет',
    write_review: 'Написать Отзыв',
    your_rating: 'Ваша оценка',
    your_comment: 'Комментарий (необязательно)',
    submit_review: 'Опубликовать',
    duration: 'Длительность',
    published: 'Опубликовано',
    genre: 'Жанр',
    language: 'Язык',
    parts: 'Части',
    author: 'Автор',
    listeners: 'Слушателей',
    rating: 'Рейтинг',

    player_speed: 'Скорость',
    player_part: 'Часть',
    player_now_playing: 'Сейчас играет',

    login_title: 'Войти',
    register_title: 'Регистрация',
    email: 'Email',
    username: 'Имя пользователя',
    password: 'Пароль',
    confirm_password: 'Подтвердите пароль',
    login_btn: 'Войти',
    register_btn: 'Зарегистрироваться',
    no_account: 'Нет аккаунта?',
    have_account: 'Уже есть аккаунт?',
    forgot_password: 'Забыли пароль?',

    upload_title: 'Загрузить Аудиокнигу',
    book_title: 'Название книги',
    book_description: 'Описание',
    book_cover: 'Обложка',
    audio_files: 'Аудиофайлы',
    add_part: 'Добавить часть',
    part_title_label: 'Название части',
    visibility_public: 'Публичная',
    visibility_private: 'Приватная',
    publish_btn: 'Опубликовать',

    profile_title: 'Мой Профиль',
    edit_profile: 'Редактировать профиль',
    change_password: 'Сменить пароль',
    current_password: 'Текущий пароль',
    change_password_btn: 'Сменить пароль',
    generate_password: 'Сгенерировать',
    bio_placeholder: 'Расскажите о себе...',
    save_changes: 'Сохранить',
    cancel: 'Отмена',
    books_listened: 'Прослушано книг',
    hours_listened: 'Часов',
    books_published_stat: 'Опубликовано книг',

    history_title: 'История Прослушиваний',
    clear_history: 'Очистить историю',
    continue_listening: 'Продолжить',
    completed: 'Завершено',
    in_progress: 'В процессе',

    admin_title: 'Панель Администратора',
    admin_users: 'Пользователи',
    admin_books: 'Книги',
    admin_reviews: 'Отзывы',
    admin_modlog: 'Журнал модерации',
    admin_stats: 'Статистика',
    total_users: 'Всего пользователей',
    total_books: 'Всего книг',
    total_reviews: 'Всего отзывов',
    block_user: 'Заблокировать',
    unblock_user: 'Разблокировать',
    delete_user: 'Удалить',
    change_role: 'Изменить роль',
    block_reason: 'Причина блокировки',
    confirm_delete: 'Вы уверены?',

    role_user: 'Пользователь',
    role_moderator: 'Модератор',
    role_admin: 'Администратор',

    error_required: 'Это поле обязательно',
    error_email: 'Неверный email',
    error_password_short: 'Пароль слишком короткий (мин. 8 символов)',
    error_password_match: 'Пароли не совпадают',
    success_login: 'Вы успешно вошли!',
    success_register: 'Аккаунт создан!',
    success_upload: 'Книга загружена!',
    success_review: 'Отзыв опубликован!',
    login_required: 'Пожалуйста, войдите',
    not_found: 'Не найдено',

    interface_language: 'Язык',
    close: 'Закрыть',
    delete: 'Удалить',
    edit: 'Редактировать',
    confirm: 'Подтвердить',
    search: 'Поиск',
  },

  en: {
    nav_home: 'Home',
    nav_catalog: 'Catalog',
    nav_upload: 'Upload',
    nav_library: 'My Library',
    nav_history: 'History',
    nav_profile: 'Profile',
    nav_admin: 'Admin',
    nav_login: 'Login',
    nav_register: 'Register',
    nav_logout: 'Logout',
    nav_my_books: 'My Books',

    hero_title: 'Listen. Create. Share.',
    hero_subtitle: 'Find your next favourite book — audiobooks in all languages of the world and for every taste.',
    hero_cta_browse: 'Browse Catalog',
    hero_cta_upload: 'Upload a Book',

    popular_books: 'Popular Books',
    new_books: 'New Releases',
    by_genre: 'By Genre',
    see_all: 'See all',

    catalog_title: 'Audiobook Catalog',
    search_placeholder: 'Search by title or author...',
    filter_genre: 'Genre',
    filter_language: 'Language',
    filter_rating: 'Min rating',
    filter_duration: 'Max duration (min)',
    sort_by: 'Sort by',
    sort_popular: 'Popularity',
    sort_rating: 'Rating',
    sort_newest: 'Newest',
    sort_title: 'Title',
    all_genres: 'All genres',
    all_languages: 'All languages',
    no_books: 'No books found',
    loading: 'Loading...',

    listen: 'Listen',
    download: 'Download',
    reviews: 'Reviews',
    no_reviews: 'No reviews yet',
    write_review: 'Write a Review',
    your_rating: 'Your rating',
    your_comment: 'Comment (optional)',
    submit_review: 'Submit Review',
    duration: 'Duration',
    published: 'Published',
    genre: 'Genre',
    language: 'Language',
    parts: 'Parts',
    author: 'Author',
    listeners: 'Listeners',
    rating: 'Rating',

    player_speed: 'Speed',
    player_part: 'Part',
    player_now_playing: 'Now Playing',

    login_title: 'Login',
    register_title: 'Create Account',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    confirm_password: 'Confirm Password',
    login_btn: 'Login',
    register_btn: 'Create Account',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    forgot_password: 'Forgot password?',

    upload_title: 'Upload Audiobook',
    book_title: 'Book Title',
    book_description: 'Description',
    book_cover: 'Cover Image',
    audio_files: 'Audio Files',
    add_part: 'Add Part',
    part_title_label: 'Part Title',
    visibility_public: 'Public',
    visibility_private: 'Private',
    publish_btn: 'Publish',

    profile_title: 'My Profile',
    edit_profile: 'Edit Profile',
    change_password: 'Change Password',
    current_password: 'Current Password',
    change_password_btn: 'Change Password',
    generate_password: 'Generate',
    bio_placeholder: 'Tell us about yourself...',
    save_changes: 'Save Changes',
    cancel: 'Cancel',
    books_listened: 'Books Listened',
    hours_listened: 'Hours',
    books_published_stat: 'Books Published',

    history_title: 'Listening History',
    clear_history: 'Clear History',
    continue_listening: 'Continue',
    completed: 'Completed',
    in_progress: 'In Progress',

    admin_title: 'Admin Dashboard',
    admin_users: 'Users',
    admin_books: 'Books',
    admin_reviews: 'Reviews',
    admin_modlog: 'Moderation Log',
    admin_stats: 'Statistics',
    total_users: 'Total Users',
    total_books: 'Total Books',
    total_reviews: 'Total Reviews',
    block_user: 'Block',
    unblock_user: 'Unblock',
    delete_user: 'Delete',
    change_role: 'Change Role',
    block_reason: 'Block Reason',
    confirm_delete: 'Are you sure?',

    role_user: 'User',
    role_moderator: 'Moderator',
    role_admin: 'Administrator',

    error_required: 'This field is required',
    error_email: 'Invalid email address',
    error_password_short: 'Password too short (min. 8 characters)',
    error_password_match: 'Passwords do not match',
    success_login: 'Successfully logged in!',
    success_register: 'Account created!',
    success_upload: 'Book uploaded!',
    success_review: 'Review published!',
    login_required: 'Please log in',
    not_found: 'Not found',

    interface_language: 'Language',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    search: 'Search',
  }
};

// ── i18n Engine ────────────────────────────────────────────
const i18n = {
  current: localStorage.getItem('ui_lang') || 'lv',

  t(key) {
    return TRANSLATIONS[this.current]?.[key] || TRANSLATIONS['en']?.[key] || key;
  },

  set(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.current = lang;
    localStorage.setItem('ui_lang', lang);
    this.apply();
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, this.t(key));
      } else {
        el.textContent = this.t(key);
      }
    });
    document.documentElement.lang = this.current;
  },

  init() {
    this.apply();
    // Highlight current lang in switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.current);
    });
  }
};

window.i18n = i18n;
window.t = (key) => i18n.t(key);
