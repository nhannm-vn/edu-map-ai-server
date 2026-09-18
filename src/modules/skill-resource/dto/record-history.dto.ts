import { IsNotEmpty, IsUUID } from 'class-validator'

export class RecordHistoryDto {
  @IsNotEmpty({ message: 'skillResourceId không được để trống' })
  @IsUUID('4', { message: 'skillResourceId phải là định dạng UUID hợp lệ' })
  skillResourceId: string | undefined
}
