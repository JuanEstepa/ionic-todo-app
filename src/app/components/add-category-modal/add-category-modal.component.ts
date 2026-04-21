/**
 * @file add-category-modal.component.ts
 * @description Modal para crear y editar categorías — se presenta como bottom sheet.
 *
 * Se usa en dos contextos:
 *  - Crear categoría nueva: se abre sin @Input(), categoryName empieza vacío
 *    y selectedColor toma el color por defecto (#3d3580).
 *  - Editar categoría existente: se pasan initialName e initialColor como
 *    componentProps desde CategoriesPage. ngOnInit los aplica al estado
 *    local y activa el modo edición (isEdit = true).
 *
 * Al guardar, el modal retorna { name, color } al padre mediante
 * modalCtrl.dismiss(). CategoriesPage decide si crear o actualizar.
 *
 * ── SELECTOR DE COLOR ─────────────────────────────────────────────────────
 *
 * Se usa un <input type="color"> nativo del navegador/WebView en lugar de
 * una librería externa, lo que reduce el bundle y funciona en iOS y Android
 * sin dependencias adicionales. El input se superpone invisible sobre el
 * bloque de preview (position: absolute, opacity: 0) para que al tocar
 * cualquier parte del área se abra el color picker nativo.
 */

import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-add-category-modal',
  templateUrl: './add-category-modal.component.html',
  styleUrls: ['./add-category-modal.component.scss'],
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCategoryModalComponent implements OnInit {
  // ─── DEPENDENCIAS ─────────────────────────────────────────────
  private readonly modalCtrl = inject(ModalController);

  // ─── INPUTS (modo edición) ────────────────────────────────────

  /** Nombre actual de la categoría cuando se abre en modo edición */
  @Input() initialName = '';

  /** Color actual de la categoría cuando se abre en modo edición */
  @Input() initialColor = '#3d3580';

  /** Referencia al input de texto para hacer foco al abrir el modal */
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  // ─── ESTADO LOCAL ─────────────────────────────────────────────
  categoryName = '';
  selectedColor = '#3d3580';
  isEdit = false;

  /**
   * Inicializa el estado local con los valores recibidos por @Input().
   * Si initialName tiene valor, el modal está en modo edición.
   */
  ngOnInit(): void {
    this.categoryName = this.initialName;
    this.selectedColor = this.initialColor;
    this.isEdit = !!this.initialName;
  }

  /**
   * Lifecycle hook de Ionic: se ejecuta cuando la animación del sheet
   * terminó. Hacer foco aquí evita que el teclado interrumpa la animación.
   */
  ionViewDidEnter(): void {
    setTimeout(() => this.titleInput.nativeElement.focus(), 100);
  }

  // ─── ACCIONES ─────────────────────────────────────────────────

  /**
   * Actualiza selectedColor con el valor del color picker nativo.
   * Se llama en el evento (input) del <input type="color">.
   *
   * @param event - Evento del input nativo de color
   */
  onColorInput(event: Event): void {
    this.selectedColor = (event.target as HTMLInputElement).value;
  }

  /**
   * Valida que haya nombre y cierra el modal retornando los datos
   * al componente padre para que cree o actualice la categoría.
   */
  async save(): Promise<void> {
    if (!this.categoryName.trim()) return;
    await this.modalCtrl.dismiss({
      name: this.categoryName.trim(),
      color: this.selectedColor,
    });
  }

  /** Cierra el modal sin retornar datos — descarta los cambios */
  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(null);
  }
}
