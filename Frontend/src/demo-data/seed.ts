import type { LearningProject, Proposal, Task, TaskDraft, Team } from '../domain/types'

const c = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, true])) as TaskDraft['confirmed']
const draft = (value: Partial<TaskDraft>): TaskDraft => ({ title:'', industry:'', organization:'', problem:'', context:'', need:'', users:'', data:'', constraints:'', outcome:'', successCriteria:'', contact:'', interactionFormat:'', feedbackProcess:'', skills:[], confirmed:{}, ...value })
const now = '2026-09-20T09:00:00.000Z'

export const seedTasks: Task[] = [
  { id:'workshop-orders', published:true, applications:3, priority:true, updatedAt:now, dueDate:'2026-11-15', draft:draft({ title:'Единый учёт заказов мастерской', industry:'Ремонт и услуги', organization:'Мастерская «Точка ремонта»', problem:'Заявки приходят в сообщениях и записываются в разные таблицы. Статусы заказов теряются.', context:'Небольшая мастерская принимает около 30 заявок в неделю из мессенджеров и по телефону.', need:'Нужен единый понятный процесс учёта заявок и заказов.', users:'Администратор и два мастера', data:'Обезличенный пример таблицы заказов и список статусов', constraints:'Без хранения платёжных данных; интерфейс должен работать на планшете', outcome:'Интерактивный прототип реестра заказов со статусами и поиском', successCriteria:'Администратор создаёт заказ, меняет статус и находит его менее чем за минуту', contact:'owner@workshop.example.invalid', interactionFormat:'Видеовстреча раз в неделю', feedbackProcess:'Комментарии к прототипу по пятницам', skills:['Исследование','Проектирование данных','Прототипирование'], confirmed:c(['context','data','outcome','success','constraints','users','communication']) }) },
  { id:'bakery-reports', published:true, applications:1, updatedAt:now, draft:draft({ title:'Еженедельный отчёт для пекарни', industry:'Отчётность', organization:'Пекарня «Тёплый хлеб»', problem:'Итоги продаж вручную собираются из трёх файлов.', context:'Управляющая тратит несколько часов на сведение таблиц.', need:'Сократить ручную подготовку отчёта.', users:'Управляющая пекарней', data:'Три обезличенных CSV-файла', outcome:'Шаблон сводного отчёта', successCriteria:'Отчёт собирается по инструкции без ручного копирования', skills:['Анализ данных','Таблицы'], confirmed:c(['context','data','outcome','success','users']) }) },
  { id:'studio-assets', published:true, applications:0, updatedAt:now, draft:draft({ title:'Навести порядок в материалах проектов', industry:'Организация данных', organization:'Дизайн-студия «Контур»', problem:'Файлы проектов хранятся в разных папках без общих правил.', context:'Команда из пяти дизайнеров ведёт параллельно до восьми проектов.', need:'Создать понятную структуру и правила именования.', users:'Дизайнеры и арт-директор', constraints:'Не переносить реальные клиентские материалы', outcome:'Прототип каталога и регламент', skills:['Информационная архитектура','Исследование'], confirmed:c(['context','outcome','constraints','users']) }) },
  { id:'repair-queue', published:true, applications:1, updatedAt:now, draft:draft({ title:'Очередь диагностики техники', industry:'Ремонт и услуги', organization:'Сервис «Честный мастер»', problem:'Клиенты не понимают, когда начнётся диагностика устройства.', context:'Сервис принимает технику в двух точках.', need:'Сделать статус диагностики прозрачным.', users:'Приёмщик и клиент', outcome:'Прототип страницы статуса обращения', skills:['Клиентский путь','Прототипирование'], confirmed:c(['context','outcome','users']) }) },
  { id:'school-requests', published:true, applications:0, updatedAt:now, draft:draft({ title:'Сбор заявок на учебные группы', industry:'Образование', organization:'Учебный центр «Вектор»', problem:'Заявки на курсы поступают в свободной форме и часто неполные.', need:'Собрать единый минимальный набор сведений.', skills:['Формы','Исследование'], confirmed:c([]) }) },
  { id:'draft-inventory', published:false, applications:0, updatedAt:now, draft:draft({ title:'Учёт расходных материалов', industry:'Ремонт и услуги', organization:'Мастерская «Точка ремонта»', problem:'Не всегда понятно, какие расходники заканчиваются.', context:'Черновик второй задачи мастерской.', need:'Понять остатки расходников.', skills:['Проектирование данных'], confirmed:c(['context']) }) },
]

seedTasks.forEach((task) => { if (task.published) task.publishedSnapshot = structuredClone(task.draft) })

export const seedTeams: Team[] = [
  { id:'team-pixel', name:'Команда «Пиксель»', members:['Алина К.','Марат С.','Диана Н.'], skills:['Исследование','Проектирование данных','Прототипирование'], xp:200 },
  { id:'team-north', name:'Команда «Север»', members:['Илья Р.','София Т.'], skills:['Анализ данных','Таблицы','Визуализация'], xp:100 },
  { id:'team-form', name:'Команда «Форма»', members:['Ринат А.','Ева П.','Алексей Г.'], skills:['Прототипирование','Клиентский путь'], xp:0 },
  { id:'team-flow', name:'Команда «Поток»', members:['Мила Д.','Артур Ж.'], skills:['Информационная архитектура','Исследование'], xp:0 },
  { id:'team-data', name:'Команда «Схема»', members:['Олег В.','Лея Б.'], skills:['Проектирование данных','Формы'], xp:0 },
]

export const seedProposals: Proposal[] = [
  { id:'p1', taskId:'workshop-orders', teamId:'team-pixel', idea:'Сначала соберём путь заявки, затем сделаем реестр с быстрыми статусами.', plan:'Интервью → схема данных → прототип → проверка сценариев', duration:'4 недели', prototypeUrl:'https://example.invalid/prototype', status:'Выбрана', createdAt:now },
  { id:'p2', taskId:'workshop-orders', teamId:'team-form', idea:'Сфокусируемся на мобильном интерфейсе приёмщика.', plan:'Аудит → сценарии → мобильный прототип', duration:'3 недели', status:'Отправлен', createdAt:now },
  { id:'p3', taskId:'workshop-orders', teamId:'team-data', idea:'Опишем статусы и связи заказов до отрисовки экранов.', plan:'Модель данных → формы → тестирование', duration:'4 недели', status:'Отправлен', createdAt:now },
  { id:'p4', taskId:'bakery-reports', teamId:'team-north', idea:'Соберём воспроизводимый шаблон отчёта.', plan:'Анализ файлов → сводная модель → инструкция', duration:'2 недели', status:'Отправлен', createdAt:now },
  { id:'p5', taskId:'repair-queue', teamId:'team-form', idea:'Спроектируем простой публичный экран статуса.', plan:'Карта пути → прототип → тест', duration:'3 недели', status:'Отправлен', createdAt:now },
]

export const seedProjects: LearningProject[] = [{
  id:'project-workshop', taskId:'workshop-orders', teamId:'team-pixel', planStatus:'Требует подтверждения наставника', evidence:[],
  milestones:[
    { id:'m1', title:'Разобраться в проблеме', objective:'Отделить наблюдаемую проблему от предполагаемого решения.', material:'Поговорите с пользователем о последнем реальном заказе. Фиксируйте шаги, переключения и потери информации.', assignment:'Составьте карту текущего процесса и отметьте две точки потери информации.', result:'Карта процесса: заявка → уточнение → оценка → ремонт → выдача. Потери: перенос из чата и устаревший статус.', feedback:'', status:'На проверке', xpAwarded:false },
    { id:'m2', title:'Спроектировать данные', objective:'Выделить сущности и статусы заказа.', material:'Начните с вопросов, на которые должен отвечать реестр. Поля добавляйте только вслед за рабочим решением.', assignment:'Подготовьте схему заказа и переходов между статусами.', result:'', feedback:'', status:'Не начат', xpAwarded:false },
    { id:'m3', title:'Собрать прототип', objective:'Связать структуру данных с основным сценарием.', material:'Прототип должен позволять пройти один критический путь без объяснений автора.', assignment:'Соберите кликабельный прототип создания и обновления заказа.', result:'', feedback:'', status:'Не начат', xpAwarded:false },
    { id:'m4', title:'Проверить решение', objective:'Проверить сценарий на представителе бизнеса.', material:'Записывайте наблюдения, а не только мнения: где человек остановился, что искал, что понял неверно.', assignment:'Проведите проверку и зафиксируйте минимум три наблюдения.', result:'', feedback:'', status:'Не начат', xpAwarded:false },
    { id:'m5', title:'Защитить личный вклад', objective:'Показать собственные решения и полученные навыки.', material:'Хорошая защита связывает принятое решение с фактом из исследования и результатом проверки.', assignment:'Опишите личный вклад и приложите подтверждающий фрагмент работы.', result:'', feedback:'', status:'Не начат', xpAwarded:false },
  ],
}]

export const sourceExamples = [
  'У нас небольшая мастерская. Заявки приходят в сообщениях и записываются в разные таблицы. Хочу видеть все заказы и их статусы.',
  'Каждую неделю сводим продажи пекарни из трёх файлов вручную.',
  'В дизайн-студии нет единых правил хранения проектных файлов.',
  'Клиенты сервиса ремонта часто звонят, чтобы узнать статус диагностики.',
  'Заявки на учебные группы приходят в свободной форме и часто неполные.',
]
